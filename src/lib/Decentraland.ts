import { EventEmitter } from 'events'
import { IPFS, IResolveDependency } from './IPFS'
import { Project, BoilerplateType, IFile } from './Project'
import { Ethereum } from './Ethereum'
import * as events from 'wildcards'
import { getRootPath } from '../utils/project'
import { LinkerAPI } from './LinkerAPI'
import { Preview } from './Preview'
import { ErrorType, fail } from '../utils/errors'

export interface IDecentralandArguments {
  workingDir?: string
  ipfsHost?: string
  ipfsPort?: number
  linkerPort?: number
  previewPort?: number
}

export interface IAddressInfo {
  x: number
  y: number
  name: string
  description: string
  ipns: string
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
    await this.project.validateParcelOptions()
    await this.validateOwnership()
    const { x, y } = await this.project.getParcelCoordinates()

    const projectFile = await this.project.getProjectFile()
    const filesAdded = await this.localIPFS.addFiles(files)
    const rootFolder = filesAdded[filesAdded.length - 1]
    const ipns = await this.ethereum.getIPNS(x, y)
    let ipfsKey = projectFile.ipfsKey

    if (!ipfsKey) {
      ipfsKey = await this.localIPFS.genIPFSKey(projectFile.id)
      await this.project.writeProjectFile({
        ipfsKey
      })
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
    await this.project.validateParcelOptions()
    await this.validateOwnership()

    return new Promise(async (resolve, reject) => {
      const landContract = await Ethereum.getLandContractAddress()
      const linker = new LinkerAPI(this.project, landContract)

      events(linker, '*', this.pipeEvents.bind(this))

      linker.on('link:success', async () => {
        resolve()
      })

      try {
        await linker.link(this.options.linkerPort)
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
    await this.project.validateParcelOptions()
    const preview = new Preview(await this.project.getDCLIgnore())

    events(preview, '*', this.pipeEvents.bind(this))

    await preview.startServer(this.options.previewPort)
  }

  async getAddressInfo(address: string): Promise<IAddressInfo[]> {
    const coords = await this.ethereum.getLandOf(address)
    const info = coords.map(async coord => {
      const data = await this.ethereum.getLandData(coord.x, coord.y)

      return {
        x: coord.x,
        y: coord.y,
        name: data ? data.name : '',
        description: data ? data.description : '',
        ipns: data ? data.ipns : ''
      }
    }) as Promise<IAddressInfo>[]
    return Promise.all(info)
  }

  async getProjectInfo(x: number, y: number) {
    const scene = await this.project.getSceneFile()
    const land = await this.ethereum.getLandData(x, y)
    const owner = await this.ethereum.getLandOwner(x, y)
    return { scene, land: { ...land, owner } }
  }

  async getParcelInfo(x: number, y: number) {
    const scene = await this.localIPFS.getRemoteSceneMetadata(x, y)
    const land = await this.ethereum.getLandData(x, y)
    const owner = await this.ethereum.getLandOwner(x, y)
    return { scene, land: { ...land, owner } }
  }

  async getParcelStatus(x: number, y: number): Promise<{ lastModified?: string; files: IResolveDependency[] }> {
    const { url } = await this.localIPFS.resolveParcel(x, y)

    if (!url) return { files: [] }

    const result: { lastModified?: string; files: IResolveDependency[] } = {
      files: url.dependencies
    }

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
    const parcels = await this.project.getParcels()
    await this.ethereum.validateAuthorization(owner, parcels)
  }
}
