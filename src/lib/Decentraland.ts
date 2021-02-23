import { EventEmitter } from 'events'
import chalk from 'chalk'
import { ethers } from 'ethers'
import * as events from 'wildcards'

import { ContentService } from './content/ContentService'
import { filterAndFillEmpty } from '../utils/land'
import { Coords } from '../utils/coordinateHelpers'
import { ErrorType, fail } from '../utils/errors'
import { DCLInfo, getConfig } from '../config'
import { SceneMetadata } from '../sceneJson/types'
import { debug } from '../utils/logging'
import { Project, BoilerplateType } from './Project'
import { Ethereum, LANDData } from './Ethereum'
import { LinkerAPI, LinkerResponse } from './LinkerAPI'
import { Preview } from './Preview'
import { API } from './API'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { isWalletConnect, getWalletConnector } from '../walletConnect/connector'

export type DecentralandArguments = {
  workingDir: string
  linkerPort?: number
  previewPort?: number
  isHttps?: boolean
  watch?: boolean
  blockchain?: boolean
  config?: DCLInfo
  forceDeploy?: boolean
  yes?: boolean
}

export type AddressInfo = {
  parcels: ({ x: number; y: number } & LANDData)[]
  estates: ({ id: number } & LANDData)[]
}

export type Parcel = LANDData & {
  owner: string
  operator?: string
  updateOperator?: string
}

export type Estate = Parcel & {
  parcels: Coords[]
}

export type ParcelMetadata = {
  scene: SceneMetadata
  land: Parcel
}

export type FileInfo = {
  name: string
  cid: string
}

export class Decentraland extends EventEmitter {
  project: Project
  ethereum: Ethereum
  options: DecentralandArguments
  provider: IEthereumDataProvider
  contentService: ContentService
  wallet: ethers.Wallet

  constructor(
    args: DecentralandArguments = {
      workingDir: process.cwd()
    }
  ) {
    super()
    this.options = args
    this.options.config = this.options.config || getConfig()
    console.assert(this.options.workingDir, 'Working directory is missing')
    debug(`Working directory: ${chalk.bold(this.options.workingDir)}`)
    this.project = new Project(this.options.workingDir)
    this.ethereum = new Ethereum()
    this.provider = this.options.blockchain ? this.ethereum : new API()
    this.contentService = new ContentService(this.options.config.catalystUrl)

    if (process.env.DCL_PRIVATE_KEY) {
      this.createWallet(process.env.DCL_PRIVATE_KEY)
    }

    // Pipe all events
    events(this.ethereum, 'ethereum:*', this.pipeEvents.bind(this))
    events(this.contentService, 'upload:*', this.pipeEvents.bind(this))
  }

  getWorkingDir(): string {
    return this.options.workingDir
  }

  async init(sceneMeta: SceneMetadata, boilerplateType: BoilerplateType) {
    await this.project.writeDclIgnore()
    await this.project.writeSceneFile(sceneMeta)
    await this.project.scaffoldProject(boilerplateType)
  }

  async link(rootCID: string): Promise<LinkerResponse> {
    await this.project.validateExistingProject()
    await this.project.validateSceneOptions()

    return new Promise<LinkerResponse>(async (resolve, reject) => {
      const linker = new LinkerAPI(this.project)
      events(linker, '*', this.pipeEvents.bind(this))
      linker.on('link:success', async (message: LinkerResponse) => {
        resolve(message)
      })

      try {
        await linker.link(this.options.linkerPort, this.options.isHttps, rootCID)
      } catch (e) {
        reject(e)
      }
    })
  }

  async preview() {
    await this.project.validateExistingProject()
    await this.project.validateSceneOptions()
    const preview = new Preview(this, await this.project.getDCLIgnore(), this.getWatch())

    events(preview, '*', this.pipeEvents.bind(this))

    await preview.startServer(this.options.previewPort)
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    const [coords, estateIds] = await Promise.all([
      this.provider.getLandOf(address),
      this.provider.getEstatesOf(address)
    ])

    const pRequests = Promise.all(coords.map(coord => this.provider.getLandData(coord)))
    const eRequests = Promise.all(estateIds.map(estateId => this.provider.getEstateData(estateId)))

    const [pData, eData] = await Promise.all([pRequests, eRequests])

    const parcels =
      pData.map((data, i) => ({
        x: coords[i].x,
        y: coords[i].y,
        ...filterAndFillEmpty(data, '')
      })) || []

    const estates =
      eData.map((data, i) => ({
        id: parseInt(estateIds[i].toString(), 10),
        ...filterAndFillEmpty(data, '')
      })) || []

    return { parcels, estates }
  }

  getWatch(): boolean {
    return !!this.options.watch
  }

  async getParcelInfo(coords: Coords): Promise<ParcelMetadata> {
    const [scene, land, blockchainOwner, operator, updateOperator] = await Promise.all([
      this.contentService.getSceneData(coords),
      this.provider.getLandData(coords),
      this.provider.getLandOwner(coords),
      this.provider.getLandOperator(coords),
      this.provider.getLandUpdateOperator(coords)
    ])

    const { EstateRegistry } = getConfig()

    if (blockchainOwner !== EstateRegistry) {
      return { scene, land: { ...land, owner: blockchainOwner, operator, updateOperator } }
    }

    const estateId = await this.provider.getEstateIdOfLand(coords)
    const owner = await this.provider.getEstateOwner(estateId)
    return { scene, land: { ...land, owner, operator, updateOperator } }
  }

  async getEstateInfo(estateId: number): Promise<Estate> {
    const estate = await this.provider.getEstateData(estateId)
    if (!estate) {
      return
    }

    const owner = await this.provider.getEstateOwner(estateId)
    const operator = await this.provider.getEstateOperator(estateId)
    const updateOperator = await this.provider.getEstateUpdateOperator(estateId)
    const parcels = await this.provider.getLandOfEstate(estateId)
    return { ...estate, owner, operator, updateOperator, parcels }
  }

  async getEstateOfParcel(coords: Coords): Promise<Estate> {
    const estateId = await this.provider.getEstateIdOfLand(coords)
    if (!estateId || estateId < 1) {
      return
    }

    return this.getEstateInfo(estateId)
  }

  getParcelStatus(x: number, y: number): Promise<{ cid: string; files: FileInfo[] }> {
    return this.contentService.getParcelStatus({ x, y })
  }

  async getPublicAddress(): Promise<string> {
    return this.wallet.getAddress()
  }

  async validateOwnership() {
    const pOwner = this.wallet ? this.wallet.getAddress() : this.project.getOwner()
    const [parcels, owner] = await Promise.all([this.project.getParcels(), pOwner])
    return this.ethereum.validateAuthorization(owner, parcels)
  }

  async getAddressAndSignature(messageToSign): Promise<LinkerResponse> {
    if (this.wallet) {
      const [signature, address] = await Promise.all([
        this.wallet.signMessage(messageToSign),
        this.wallet.getAddress()
      ])
      return { signature, address, network: { id: 0, name: 'mainnet' } }
    }

    if (isWalletConnect()) {
      const connector = getWalletConnector()
      const address = connector.accounts[0]
      const signature = await connector.signMessage([address, messageToSign])
      return {
        signature,
        address,
        // TODO support Ropsten and other networks with WC
        network: { id: connector.networkId, name: 'mainnet' }
      }
    }

    return this.link(messageToSign)
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }

  private createWallet(privateKey: string): void {
    let length = 64

    if (privateKey.startsWith('0x')) {
      length = 66
    }

    if (privateKey.length !== length) {
      fail(ErrorType.DEPLOY_ERROR, 'Addresses should be 64 characters length.')
    }

    this.wallet = new ethers.Wallet(privateKey)
  }
}
