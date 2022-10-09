import { Scene } from '@dcl/schemas'
import { EventEmitter } from 'events'
import chalk from 'chalk'
import events from 'wildcards'

import { ContentService } from './content/ContentService'
import { filterAndFillEmpty } from '../utils/land'
import { Coords } from '../utils/coordinateHelpers'
import { ErrorType, fail } from '../utils/errors'
import { DCLInfo, getConfig } from '../config'
import { debug } from '../utils/logging'
import { Ethereum, LANDData, providerInstance } from './Ethereum'
import { LinkerAPI, LinkerResponse } from './LinkerAPI'
import { PreviewComponents, wirePreview } from './Preview'
import portfinder from 'portfinder'
import { API } from './API'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { createWorkspace, Workspace } from './Workspace'
import {
  ethSign,
  recoverAddressFromEthSignature
} from '@dcl/crypto/dist/crypto'
import { IdentityType } from '@dcl/crypto'
import crypto from 'crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import {
  roomsMetrics,
  createRoomsComponent
} from '@dcl/mini-comms/dist/adapters/rooms'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent } from '@well-known-components/http-server'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { createWsComponent } from './adapters/ws'
import future from 'fp-future'

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
  skipValidations?: boolean
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
  environmentIdentity?: IdentityType

  stop: () => Promise<void> = async () => void 0

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

  getProjectHash(): string {
    return crypto
      .createHash('sha256')
      .update(this.options.workingDir)
      .digest('hex')
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
          rootCID,
          !!this.options.skipValidations
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

    // eslint-disable-next-line
    const dcl = this

    const port = await previewPort(dcl)

    const startedFuture = future<void>()

    setTimeout(
      () => startedFuture.reject(new Error('Timed out starting the server')),
      3000
    )

    void Lifecycle.run<PreviewComponents>({
      async initComponents() {
        const metrics = createTestMetricsComponent(roomsMetrics)
        const config = createRecordConfigComponent({
          HTTP_SERVER_PORT: port,
          HTTP_SERVER_HOST: '0.0.0.0',
          ...process.env
        })
        const logs = await createConsoleLogComponent({})
        const ws = await createWsComponent({ logs })
        const server = await createServerComponent<PreviewComponents>(
          { config, logs, ws: ws.ws },
          { cors: {} }
        )
        const rooms = await createRoomsComponent({
          metrics,
          logs,
          config
        })

        return {
          logs,
          ethereumProvider: providerInstance,
          rooms,
          config,
          dcl,
          metrics,
          server,
          ws
        }
      },
      async main({ components, startComponents, stop }) {
        try {
          await wirePreview(components, dcl.getWatch())
          await startComponents()
          dcl.emit(
            'preview:ready',
            await components.config.requireNumber('HTTP_SERVER_PORT')
          )
          dcl.stop = stop
          startedFuture.resolve()
        } catch (err: any) {
          startedFuture.reject(err)
        }
      }
    })

    return
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

  async getAddressAndSignature(messageToSign: string): Promise<LinkerResponse> {
    if (this.environmentIdentity) {
      return {
        signature: ethSign(
          hexToBytes(this.environmentIdentity.privateKey),
          messageToSign
        ),
        address: this.environmentIdentity.address
      }
    }

    return this.link(messageToSign)
  }

  private pipeEvents(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }

  private createWallet(privateKey: string) {
    let length = 64

    if (privateKey.startsWith('0x')) {
      length = 66
    }

    if (privateKey.length !== length) {
      fail(ErrorType.DEPLOY_ERROR, 'Addresses should be 64 characters length.')
    }

    const pk = hexToBytes(privateKey)
    const msg = Math.random().toString()
    const signature = ethSign(pk, msg)
    const address = recoverAddressFromEthSignature(signature, msg)
    this.environmentIdentity = {
      address,
      privateKey,
      publicKey: '0x'
    }
  }
}

async function previewPort(dcl: Decentraland) {
  let resolvedPort = dcl.options.previewPort || 0

  if (!resolvedPort) {
    try {
      resolvedPort = await portfinder.getPortPromise()
    } catch (e) {
      resolvedPort = 2044
    }
  }

  return resolvedPort.toString()
}
