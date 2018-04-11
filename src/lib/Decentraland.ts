import { EventEmitter } from 'events'
import { IPFS } from './IPFS'
import { Project, BoilerplateType } from './Project'
import { Ethereum } from './Ethereum'
import * as events from 'wildcards'
import { getRootPath } from '../utils/project'
import { LinkerAPI } from './LinkerAPI'
import { buildTypescript } from '../utils/moduleHelpers'
import { Preview } from './Preview'

export interface IDecentralandArguments {
  workingDir?: string
  ipfsHost?: string
  ipfsPort?: number
  linkerPort?: number
  previewPort?: number
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

  async deploy() {
    await this.project.validateExistingProject()
    await Ethereum.connect()

    const files = await this.project.getFiles()
    const coords = await this.project.getParcelCoordinates()
    const projectFile = await this.project.getProjectFile()
    const filesAdded = await this.localIPFS.addFiles(files)
    const rootFolder = filesAdded[filesAdded.length - 1]
    const ipns = await this.ethereum.getIPNS(coords)
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
      await this.link()
    }

    await this.pin()
  }

  async link() {
    await this.project.validateExistingProject()
    await Ethereum.connect()

    return new Promise(async (resolve, reject) => {
      const projectFile = await this.project.getProjectFile()
      const sceneFile = await this.project.getSceneFile()
      const landContract = await Ethereum.getLandContractAddress()
      const linker = new LinkerAPI(sceneFile, projectFile, landContract)

      events(linker, '*', this.pipeEvents.bind(this))

      linker.on('link_success', async () => {
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
      const preview = new Preview()

      events(preview, '*', this.pipeEvents.bind(this))

      preview.startServer(this.options.previewPort)
    })
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }
}
