import { EventEmitter } from 'events'
import * as events from 'wildcards'

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

  constructor(args: DecentralandArguments = {}) {
    super()
    this.options = args
    this.options.workingDir = args.workingDir || getRootPath()
    this.project = new Project(this.options.workingDir)
    this.ethereum = new Ethereum()
    this.provider = this.ethereum
    this.contentService = new ContentService(new ContentClient(args.contentServerUrl))

    if (!this.options.blockchain) {
      this.provider = new API()
    }

    // Pipe all events
    events(this.ethereum, 'ethereum:*', this.pipeEvents.bind(this))
    events(this.contentService,'upload:*', this.pipeEvents.bind(this))
  }

  async init(sceneMeta: DCL.SceneMetadata, boilerplateType: BoilerplateType, websocketServer?: string) {
    await this.project.writeDclIgnore()
    await this.project.writeSceneFile(sceneMeta)
    await this.project.scaffoldProject(boilerplateType, websocketServer)
  }

  async deploy(files: IFile[]) {
    await this.project.validateSceneOptions()
    await this.validateOwnership()
    const { x, y } = await this.project.getParcelCoordinates()
    await this.ethereum.getIPNS(x, y)
    const rootCID = await CIDUtils.getFilesComposedCID(files)

    try {
      const signature = await this.link(rootCID)
      const uploadResult = await this.contentService.uploadContent(rootCID, files, signature)
      if (!uploadResult) {
        fail(ErrorType.UPLOAD_ERROR, "Fail to upload the content")
      }
    } catch (e) {
      fail(ErrorType.LINKER_ERROR, e.message)
    }

  }

  async link(rootCID: string) {
    await this.project.validateExistingProject()
    await this.project.validateSceneOptions()
    await this.validateOwnership()

    return new Promise<string>(async (resolve, reject) => {
      const manaContract = await Ethereum.getContractAddress('MANAToken')
      const landContract = await Ethereum.getContractAddress('LANDProxy')
      const estateContract = await Ethereum.getContractAddress('EstateProxy')

      const linker = new LinkerAPI(this.project, manaContract, landContract, estateContract)

      events(linker, '*', this.pipeEvents.bind(this))

      linker.on('link:success', async (signature: string) => {
        resolve(signature)
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

  async getProjectInfo(x: number, y: number) {
    const scene = await this.project.getSceneFile()
    const land = await this.provider.getLandData({ x, y })
    const owner = await this.provider.getLandOwner({ x, y })
    return { scene, land: { ...land, owner } }
  }

  async getParcelInfo({ x, y }: Coords): Promise<ParcelMetadata> {
    const [scene, land, owner] = await Promise.all([
      null, // this.localIPFS.getRemoteSceneMetadata(x, y), Get Scene from content server
      this.provider.getLandData({ x, y }),
      this.provider.getLandOwner({ x, y })
    ])

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
    if (!estateId) {
      return
    }

    return this.getEstateInfo(estateId)
  }

  async getParcelStatus(x: number, y: number): Promise<{ ipns?: string; files: FileInfo[] }> {
    const information = await this.contentService.getParcelStatus(x, y)
    if (information) {
      const files: FileInfo [] = []
      for (const key in information.contents) {
        files.push({ name: key, cid: information.contents[key] })
      }
      return { ipns: information.root_cid, files: files }
    }
    return { files: [] }
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }

  private async validateOwnership() {
    const owner = await this.project.getOwner()
    const estate = await this.project.getEstate()
    if (estate) {
      await this.ethereum.validateAuthorizationOfEstate(owner, estate)
      const parcels = await this.project.getParcels()
      await this.ethereum.validateParcelsInEstate(estate, parcels)
    } else {
      const parcel = await this.project.getParcelCoordinates()
      await this.ethereum.validateAuthorizationOfParcel(owner, parcel)
    }
  }
}
