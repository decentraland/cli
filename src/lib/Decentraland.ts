import { EventEmitter } from 'events'
import * as events from 'wildcards'
import { ethers } from 'ethers'

import { Project, BoilerplateType, IFile } from './Project'
import { Ethereum, LANDData } from './Ethereum'
import { LinkerAPI } from './LinkerAPI'
import { Preview } from './Preview'
import { getRootPath } from '../utils/project'
import { ErrorType, fail } from '../utils/errors'
import { Coords } from '../utils/coordinateHelpers'
import { API } from './API'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { filterAndFillEmpty } from '../utils/land'
import { CIDUtils } from './content/CIDUtils'
import { ContentClient } from './content/ContentClient'
import { ContentService } from './content/ContentService'

export type DecentralandArguments = {
  workingDir?: string
  linkerPort?: number
  previewPort?: number
  isHttps?: boolean
  watch?: boolean
  blockchain?: boolean
  contentServerUrl?: string
  forceDeploy?: boolean
}

export type AddressInfo = { parcels: ({ x: number; y: number } & LANDData)[]; estates: ({ id: number } & LANDData)[] }

export type Parcel = LANDData & {
  owner: string
  operators?: string[]
}

export type Estate = Parcel & {
  parcels: Coords[]
}

export type ParcelMetadata = {
  scene: DCL.SceneMetadata
  land: Parcel
}

export type FileInfo = {
  name: string
  cid: string
}

export class Decentraland extends EventEmitter {
  project: Project
  ethereum: Ethereum
  options: DecentralandArguments = {}
  provider: IEthereumDataProvider
  contentService: ContentService
  wallet: ethers.Wallet
  forceDeploy: boolean

  constructor(args: DecentralandArguments = {}) {
    super()
    this.options = args
    this.options.workingDir = args.workingDir || getRootPath()
    this.project = new Project(this.options.workingDir)
    this.ethereum = new Ethereum()
    this.provider = this.ethereum
    this.contentService = new ContentService(new ContentClient(args.contentServerUrl))
    this.forceDeploy = args.forceDeploy || false

    if (!this.options.blockchain) {
      this.provider = new API()
    }

    if (process.env.DCL_PRIVATE_KEY) {
      this.createWallet(process.env.DCL_PRIVATE_KEY)
    }

    // Pipe all events
    events(this.ethereum, 'ethereum:*', this.pipeEvents.bind(this))
    events(this.contentService, 'upload:*', this.pipeEvents.bind(this))
  }

  async init(sceneMeta: DCL.SceneMetadata, boilerplateType: BoilerplateType, websocketServer?: string) {
    await this.project.writeDclIgnore()
    await this.project.writeSceneFile(sceneMeta)
    await this.project.scaffoldProject(boilerplateType, websocketServer)
  }

  async deploy(files: IFile[]) {
    await this.project.validateSceneOptions()
    await this.validateOwnership()
    const rootCID = await CIDUtils.getFilesComposedCID(files)

    try {
      const { signature, address } = await this.getAddressAndSignature(rootCID)
      const uploadResult = await this.contentService.uploadContent(rootCID, files, signature, address, this.forceDeploy)
      if (!uploadResult) {
        fail(ErrorType.UPLOAD_ERROR, 'Fail to upload the content')
      }
    } catch (e) {
      fail(ErrorType.LINKER_ERROR, e.message)
    }
  }

  async link(rootCID: string): Promise<string> {
    await this.project.validateExistingProject()
    await this.project.validateSceneOptions()

    return new Promise<string>(async (resolve, reject) => {
      const manaContract = await Ethereum.getContractAddress('MANAToken')
      const landContract = await Ethereum.getContractAddress('LANDProxy')

      const linker = new LinkerAPI(this.project, manaContract, landContract)

      events(linker, '*', this.pipeEvents.bind(this))

      linker.on('link:success', async (message: string) => {
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
    const preview = new Preview(await this.project.getDCLIgnore(), this.getWatch())

    events(preview, '*', this.pipeEvents.bind(this))

    await preview.startServer(this.options.previewPort)
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    const [coords, estateIds] = await Promise.all([this.provider.getLandOf(address), this.provider.getEstatesOf(address)])

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
    const [scene, land, blockchainOwner] = await Promise.all([
      this.contentService.getSceneData(coords),
      this.provider.getLandData(coords),
      this.provider.getLandOwner(coords)
    ])

    const estateProxyAddress = await Ethereum.getContractAddress('EstateProxy')

    if (blockchainOwner !== estateProxyAddress) {
      return { scene, land: { ...land, owner: blockchainOwner } }
    }

    const estateId = await this.provider.getEstateIdOfLand(coords)
    const owner = await this.provider.getEstateOwner(estateId)
    return { scene, land: { ...land, owner } }
  }

  async getEstateInfo(estateId: number): Promise<Estate> {
    const estate = await this.provider.getEstateData(estateId)
    if (!estate) {
      return
    }

    const owner = await this.provider.getEstateOwner(estateId)
    const parcels = await this.provider.getLandOfEstate(estateId)
    return { ...estate, owner, parcels }
  }

  async getEstateOfParcel(coords: Coords): Promise<Estate> {
    const estateId = await this.provider.getEstateIdOfLand(coords)
    if (!estateId || estateId < 1) {
      return
    }

    return this.getEstateInfo(estateId)
  }

  async getParcelStatus(x: number, y: number): Promise<{ cid?: string; files: FileInfo[] }> {
    const information = await this.contentService.getParcelStatus({ x: x, y: y })
    if (information) {
      const files: FileInfo[] = []
      for (const key in information.contents) {
        files.push({ name: key, cid: information.contents[key] })
      }
      return { cid: information.root_cid, files: files }
    }
    return { files: [] }
  }

  async getPublicAddress(): Promise<string> {
    return this.wallet.getAddress()
  }

  private async getAddressAndSignature(rootCID): Promise<{ signature: string; address: string }> {
    if (this.wallet) {
      const [signature, address] = await Promise.all([this.wallet.signMessage(rootCID), this.wallet.getAddress()])
      return { signature, address }
    }

    const message = await this.link(rootCID)
    return JSON.parse(message)
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }

  private async validateOwnership() {
    const pOwner = this.wallet ? this.wallet.getAddress() : this.project.getOwner()
    const [parcels, owner] = await Promise.all([this.project.getParcels(), pOwner])
    return this.ethereum.validateAuthorization(owner, parcels)
  }

  private createWallet(privateKey: string): void {
    if (privateKey.length !== 64) {
      fail(ErrorType.DEPLOY_ERROR, 'Addresses should be 64 characters length.')
    }

    this.wallet = new ethers.Wallet(privateKey)
  }
}
