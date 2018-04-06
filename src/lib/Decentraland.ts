import { EventEmitter } from 'events'
import { IPFS } from './IPFS'
import { Project } from './Project'
import { Ethereum } from './Ethereum'
import * as events from 'wildcards'
import { getRootPath } from '../utils/project'
import { LinkerAPI } from './LinkerAPI'
import { buildTypescript } from '../utils/module-helpers'
import { Preview } from './Preview'

export interface IDecentralandArguments {
  ipfsHost?: string
  ipfsPort?: number
}

/**
 * Events emitted by this class:
 *
 * ipfs:key-success - The IPFS key was successfully generated and written to the `project.json` file
 */
export class Decentraland extends EventEmitter {
  private localIPFS: IPFS
  private project: Project
  private ethereum: Ethereum

  constructor(args: IDecentralandArguments = {}) {
    super()
    this.localIPFS = new IPFS(args.ipfsHost, args.ipfsPort)
    this.project = new Project()
    this.ethereum = new Ethereum()

    // Pipe all events
    events(this.localIPFS, '*', this.pipeEvents.bind(this))
    events(this.project, '*', this.pipeEvents.bind(this))
    events(this.ethereum, '*', this.pipeEvents.bind(this))
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
      await this.project.writeProjectFile(getRootPath(), {
        ipfsKey
      })
      this.emit('ipfs:key-success')
    }

    await this.localIPFS.publish(projectFile.id, `/ipfs/${rootFolder.hash}`)

    if (this.ethereum.isValidIPNS(ipns) && ipfsKey !== ipns) {
      await this.link()
    }

    await this.pin()
  }

  async link(port?: number) {
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
        await linker.link(port)
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

  async preview(port?: number) {
    return new Promise(async (resolve, reject) => {
      await this.project.validateExistingProject()
      const paths = await this.project.getAllFilePaths()
      const preview = new Preview()

      events(preview, '*', this.pipeEvents.bind(this))

      if (paths.find(path => path.includes('tsconfig.json'))) {
        await buildTypescript()
      }

      preview.startServer(port)
    })
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }
}
