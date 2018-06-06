import { EventEmitter } from 'events'
import { IPFS } from './IPFS'
import { Project, BoilerplateType, IFile } from './Project'
import { Ethereum } from './Ethereum'
import * as events from 'wildcards'
import { getRootPath } from '../utils/project'
import { LinkerAPI } from './LinkerAPI'
import { Preview } from './Preview'
import { ErrorType, fail } from '../utils/errors'
import * as Coordinates from '../utils/coordinateHelpers'

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
    const coords = await this.project.getParcelCoordinates()
    const projectFile = await this.project.getProjectFile()
    const filesAdded = await this.localIPFS.addFiles(files)
    const rootFolder = filesAdded[filesAdded.length - 1]
    const ipns = await this.ethereum.getIPNS(coords.x, coords.y)
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

    await this.pin()
  }

  async link() {
    await this.project.validateExistingProject()

    return new Promise(async (resolve, reject) => {
      const projectFile = await this.project.getProjectFile()
      const sceneFile = await this.project.getSceneFile()
      const landContract = await Ethereum.getLandContractAddress()
      const linker = new LinkerAPI(sceneFile, projectFile, landContract)

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

  async pin() {
    await this.project.validateExistingProject()
    const coords = await this.project.getParcelCoordinates()
    const peerId = await this.localIPFS.getPeerId()
    await this.localIPFS.pinFiles(peerId, coords)
  }

  async preview() {
    return new Promise(async (resolve, reject) => {
      await this.project.validateExistingProject()
      const preview = new Preview(await this.project.getDCLIgnore())

      events(preview, '*', this.pipeEvents.bind(this))

      preview.startServer(this.options.previewPort)
    })
  }

  async getAddressInfo(address: string): Promise<IAddressInfo[]> {
    const coords = await this.ethereum.getLandOf(address)
    const info = coords.map(async coord => {
      const data = await this.ethereum.getLandData(coord.x, coord.y)
      return {
        x: coord.x,
        y: coord.y,
        name: data.name,
        description: data.description,
        ipns: data.ipns
      }
    }) as Promise<IAddressInfo>[]
    return Promise.all(info)
  }

  async getProjectInfo() {
    return this.project.getSceneFile()
  }

  async getParcelInfo(x: number, y: number) {
    return {
      scene: await this.localIPFS.getRemoteSceneMetadata(x, y),
      land: await this.ethereum.getLandData(x, y)
    }
  }

  async getParcelStatus(x: number, y: number) {
    return this.localIPFS.getDeployedFiles(x, y)
  }

  async getProjectStatus() {
    const scene = await this.project.getSceneFile()
    const coords = Coordinates.getObject(scene.scene.base)
    const files = await this.localIPFS.getDeployedFiles(coords.x, coords.y)
    if (!files) fail(ErrorType.STATUS_ERROR, 'No files found')
    return files
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }
}
