import { EventEmitter } from 'events'
import * as events from 'wildcards'

import { IPFS, IResolveDependency } from './IPFS'
import { Project, BoilerplateType, IFile } from './Project'
import { Ethereum, LANDData } from './Ethereum'
import { LinkerAPI } from './LinkerAPI'
import { Preview } from './Preview'
import { getRootPath } from '../utils/project'
import { ErrorType, fail } from '../utils/errors'
import { Coords } from '../utils/coordinateHelpers'

export interface IDecentralandArguments {
  workingDir?: string
  ipfsHost?: string
  ipfsPort?: number
  linkerPort?: number
  previewPort?: number
  isHttps?: boolean
  watch?: boolean
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

export class Decentraland extends EventEmitter {
  localIPFS: IPFS
  project: Project
  ethereum: Ethereum
  options: IDecentralandArguments = {}

  constructor(args: IDecentralandArguments = {}) {
    super()
    this.options = args
    this.options.workingDir = args.workingDir || getRootPath()
    this.localIPFS = new IPFS(args.ipfsHost, args.ipfsPort)
    this.project = new Project(this.options.workingDir)
    this.ethereum = new Ethereum()

    // Pipe all events
    events(this.localIPFS, 'ipfs:*', this.pipeEvents.bind(this))
    events(this.ethereum, 'ethereum:*', this.pipeEvents.bind(this))
  }

  async init(sceneMeta: DCL.SceneMetadata, boilerplateType: BoilerplateType, websocketServer?: string) {
    await this.project.writeDclIgnore()
    await this.project.initProject()
    await this.project.writeSceneFile(sceneMeta)
    await this.project.scaffoldProject(boilerplateType, websocketServer)
  }

  async deploy(files: IFile[]) {
    await this.project.validateSceneOptions()
    await this.validateOwnership()
    const { x, y } = await this.project.getParcelCoordinates()

    const projectFile = await this.project.getProjectFile()
    const filesAdded = await this.localIPFS.addFiles(files)
    const rootFolder = filesAdded[filesAdded.length - 1]
    const ipns = await this.ethereum.getIPNS(x, y)
    let ipfsKey = projectFile.ipfsKey

    if (!ipfsKey) {
      ipfsKey = await this.localIPFS.genIPFSKey(projectFile.id)
      await this.project.writeProjectFile({ ipfsKey })
      this.localIPFS.genKeySuccess()
    }

    await this.localIPFS.publish(projectFile.id, `/ipfs/${rootFolder.hash}`)

    if (ipfsKey !== ipns) {
      try {
        await this.link()
      } catch (e) {
        fail(ErrorType.LINKER_ERROR, e.message)
      }
    }

    await this.pin(rootFolder.hash)
  }

  async link() {
    await this.project.validateExistingProject()
    await this.project.validateSceneOptions()
    await this.validateOwnership()

    return new Promise(async (resolve, reject) => {
      const manaContract = await Ethereum.getContractAddress('MANAToken')
      const landContract = await Ethereum.getContractAddress('LANDProxy')
      const estateContract = await Ethereum.getContractAddress('EstateProxy')

      const linker = new LinkerAPI(this.project, manaContract, landContract, estateContract)

      events(linker, '*', this.pipeEvents.bind(this))

      linker.on('link:success', async () => {
        resolve()
      })

      try {
        await linker.link(this.options.linkerPort, this.options.isHttps)
      } catch (e) {
        reject(e)
      }
    })
  }

  async pin(ipfsHash?: string) {
    await this.project.validateExistingProject()
    const coords = await this.project.getParcelCoordinates()
    const peerId = await this.localIPFS.getPeerId()
    await this.localIPFS.pinFiles(peerId, coords, ipfsHash)
  }

  async preview() {
    await this.project.validateExistingProject()
    await this.project.validateSceneOptions()
    const preview = new Preview(await this.project.getDCLIgnore(), this.getWatch())

    events(preview, '*', this.pipeEvents.bind(this))

    await preview.startServer(this.options.previewPort)
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    const [coords, estateIds] = await Promise.all([this.ethereum.getLandOf(address), this.ethereum.getEstatesOf(address)])

    const pRequests = Promise.all(coords.map(coord => this.ethereum.getLandData(coord.x, coord.y)))
    const eRequests = Promise.all(estateIds.map(estateId => this.ethereum.getEstateData(estateId)))

    const [pData, eData] = await Promise.all([pRequests, eRequests])

    const parcels =
      pData.map((data, i) => ({
        x: coords[i].x,
        y: coords[i].y,
        name: data ? data.name : '',
        description: data ? data.description : '',
        ipns: data ? data.ipns : ''
      })) || []

    const estates =
      eData.map((data, i) => ({
        id: parseInt(estateIds[i].toString(), 10),
        name: data ? data.name : '',
        description: data ? data.description : '',
        ipns: data ? data.ipns : ''
      })) || []

    return { parcels, estates }
  }

  getWatch(): boolean {
    return !!this.options.watch
  }

  async getProjectInfo(x: number, y: number) {
    const scene = await this.project.getSceneFile()
    const land = await this.ethereum.getLandData(x, y)
    const owner = await this.ethereum.getLandOwner(x, y)
    return { scene, land: { ...land, owner } }
  }

  async getParcelInfo({ x, y }: Coords): Promise<ParcelMetadata> {
    const scene = await this.localIPFS.getRemoteSceneMetadata(x, y)
    const land = await this.ethereum.getLandData(x, y)
    const owner = await this.ethereum.getLandOwner(x, y)
    return { scene, land: { ...land, owner } }
  }

  async getEstateInfo(estateId: number): Promise<Estate> {
    const estate = await this.ethereum.getEstateData(estateId)
    if (!estate) {
      return
    }

    const owner = await this.ethereum.getEstateOwner(estateId)
    const parcels = await this.ethereum.getLandOfEstate(estateId)
    return { ...estate, owner, parcels }
  }

  async getEstateOfParcel(coords: Coords): Promise<Estate> {
    const estateId = await this.ethereum.getEstateIdOfLand(coords)
    if (!estateId) {
      return
    }

    return this.getEstateInfo(estateId)
  }

  async getParcelStatus(x: number, y: number): Promise<{ lastModified?: string; files: IResolveDependency[] }> {
    const { url } = await this.localIPFS.resolveParcel(x, y)

    if (!url) return { files: [] }

    const result: { lastModified?: string; files: IResolveDependency[] } = { files: url.dependencies }

    if (url.lastModified) {
      // only available in redis metadata >= 2
      result.lastModified = url.lastModified
    }

    return result
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
