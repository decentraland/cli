import { ChainId, Scene } from '@dcl/schemas'
import { EventEmitter } from 'events'
import chalk from 'chalk'
import { ethers } from 'ethers'
import events from 'wildcards'

import { ContentService } from './content/ContentService'
import { filterAndFillEmpty } from '../utils/land'
import { Coords } from '../utils/coordinateHelpers'
import { ErrorType, fail } from '../utils/errors'
import { DCLInfo, getConfig } from '../config'
import { debug } from '../utils/logging'
import { Ethereum, LANDData } from './Ethereum'
import { LinkerAPI, LinkerResponse, LinkerResponseIdentity, LinkerResponseScenenDeploy } from './LinkerAPI'
import { Preview } from './Preview'
import { API } from './API'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { createWorkspace, Workspace } from './Workspace'
import { createIdentity } from '@dcl/builder-client'

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
  scene: Scene
  land: Parcel
}

export type FileInfo = {
  name: string
  cid: string
}

export class Decentraland extends EventEmitter {
  workspace: Workspace
  ethereum: Ethereum
  options: DecentralandArguments
  provider: IEthereumDataProvider
  contentService: ContentService
  wallet?: ethers.Wallet

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
    this.workspace = createWorkspace({ workingDir: this.options.workingDir })
    this.ethereum = new Ethereum()
    this.provider = this.options.blockchain ? this.ethereum : new API()
    this.contentService = new ContentService(this.options.config.catalystUrl!)

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

  async link(rootCID: string): Promise<LinkerResponse> {
    const project = this.workspace.getSingleProject()
    if (!project) {
      throw new Error(
        'Cannot link a workspace. Please set you current directory in the project folder.'
      )
    }

    await project.validateExistingProject()
    await project.validateSceneOptions()

    return new Promise<LinkerResponse>(async (resolve, reject) => {
      const linker = new LinkerAPI(project)
      events(linker, '*', this.pipeEvents.bind(this))
      linker.on('link:success', async (message: LinkerResponse) => {
        resolve(message)
      })

      try {
        await linker.link(
          this.options.linkerPort!,
          !!this.options.isHttps,
          rootCID
        )
      } catch (e) {
        reject(e)
      }
    })
  }

  async preview() {
    for (const project of this.workspace.getAllProjects()) {
      await project.validateExistingProject()
      await project.validateSceneOptions()
    }

    const preview = new Preview(this, this.getWatch())

    events(preview, '*', this.pipeEvents.bind(this))

    await preview.startServer(this.options.previewPort!)
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    const [coords, estateIds] = await Promise.all([
      this.provider.getLandOf(address),
      this.provider.getEstatesOf(address)
    ])

    const pRequests = Promise.all(
      coords.map((coord) => this.provider.getLandData(coord))
    )
    const eRequests = Promise.all(
      estateIds.map((estateId) => this.provider.getEstateData(estateId))
    )

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
    const [scene, land, blockchainOwner, operator, updateOperator] =
      await Promise.all([
        this.contentService.getSceneData(coords),
        this.provider.getLandData(coords),
        this.provider.getLandOwner(coords),
        this.provider.getLandOperator(coords),
        this.provider.getLandUpdateOperator(coords)
      ])

    const { EstateRegistry } = getConfig()

    if (blockchainOwner !== EstateRegistry) {
      return {
        scene,
        land: { ...land, owner: blockchainOwner, operator, updateOperator }
      }
    }

    const estateId = await this.provider.getEstateIdOfLand(coords)
    const owner = await this.provider.getEstateOwner(estateId)
    return { scene, land: { ...land, owner, operator, updateOperator } }
  }

  async getEstateInfo(estateId: number): Promise<Estate | undefined> {
    const estate = await this.provider.getEstateData(estateId)
    if (!estate) {
      return undefined
    }

    const owner = await this.provider.getEstateOwner(estateId)
    const operator = await this.provider.getEstateOperator(estateId)
    const updateOperator = await this.provider.getEstateUpdateOperator(estateId)
    const parcels = await this.provider.getLandOfEstate(estateId)
    return { ...estate, owner, operator, updateOperator, parcels }
  }

  async getEstateOfParcel(coords: Coords): Promise<Estate | undefined> {
    const estateId = await this.provider.getEstateIdOfLand(coords)
    if (!estateId || estateId < 1) {
      return undefined
    }

    return this.getEstateInfo(estateId)
  }

  getParcelStatus(
    x: number,
    y: number
  ): Promise<{ cid: string; files: FileInfo[] }> {
    return this.contentService.getParcelStatus({ x, y })
  }

  async getPublicAddress(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    return this.wallet?.getAddress()!
  }

  async getAddressAndSignature(
    messageToSign: string
  ): Promise<LinkerResponseScenenDeploy> {
    if (this.wallet) {
      const [signature, address] = await Promise.all([
        this.wallet.signMessage(messageToSign),
        this.wallet.getAddress()
      ])
      return {
        responseType: 'scene-deploy',
        payload: { signature, address, chainId: ChainId.ETHEREUM_MAINNET }
      }
    }

    const response = await this.link(messageToSign)
    if (response.responseType !== 'scene-deploy') {
      console.error({ response })
      throw new Error('Linker-dapp responses an invalid scene sign')
    }
    return response
  }

  async getIdentity(): Promise<LinkerResponseIdentity> {
    if (this.wallet) {
      const identity = await createIdentity(this.wallet as any, 1000)
      const address = await this.wallet.getAddress()
      return {
        responseType: 'identity',
        payload: { identity, address, chainId: ChainId.ETHEREUM_MAINNET }
      }
    }

    const response = await this.link('')
    if (response.responseType !== 'identity') {
      console.error({ response })
      throw new Error('Linker-dapp responses an invalid identity')
    }
    return response
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
