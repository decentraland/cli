import path from 'path'

import { readJSON, writeJSON, getUserHome } from './utils/filesystem'
import { removeEmptyKeys } from './utils'
import { isStableVersion } from './utils/moduleHelpers'
import { isDevelopment } from './utils/env'

export type DCLInfo = {
  fileExists?: boolean
  userId: string
  trackStats: boolean
  provider?: string
  MANAToken?: string
  LANDRegistry?: string
  EstateRegistry?: string
  catalystUrl?: string
  dclApiUrl?: string
  segmentKey?: string
}

let networkFlag: string
let config: DCLInfo

/**
 * Returns the path to the `.dclinfo` file located in the local HOME folder
 */
function getDCLInfoPath(): string {
  return path.resolve(getUserHome(), '.dclinfo')
}

/**
 * Reads the contents of the `.dclinfo` file
 */
async function readDCLInfo(): Promise<DCLInfo | null> {
  const filePath = getDCLInfoPath()
  try {
    const file = await readJSON<DCLInfo>(filePath)
    return file
  } catch (e) {
    return null
  }
}

/**
 * Creates the `.dclinfo` file in the HOME directory
 */
export function createDCLInfo(dclInfo: DCLInfo) {
  config = dclInfo
  return writeJSON(getDCLInfoPath(), dclInfo)
}

/**
 * Add new configuration to `.dclinfo` file
 */
export async function writeDCLInfo(newInfo: DCLInfo) {
  return writeJSON(getDCLInfoPath(), { ...config, newInfo })
}

/**
 * Reads `.dclinfo` file and loads it in-memory to be sync-obtained with `getDCLInfo()` function
 */
export async function loadConfig(network: string): Promise<DCLInfo> {
  networkFlag = network
  config = (await readDCLInfo())!
  return config
}

/**
 * Returns the contents of the `.dclinfo` file. It needs to be loaded first with `loadConfig()` function
 */
export function getDCLInfo(): DCLInfo {
  return config
}

export function getConfig(network: string = networkFlag): DCLInfo {
  const envConfig = getEnvConfig()
  const dclInfoConfig = getDclInfoConfig()
  const defaultConfig = getDefaultConfig(network)
  const config = { ...defaultConfig, ...dclInfoConfig, ...envConfig } as DCLInfo
  return config
}

export function getCustomConfig(): Partial<DCLInfo> {
  const envConfig = getEnvConfig()
  const dclInfoConfig = getDclInfoConfig()
  return { ...dclInfoConfig, ...envConfig }
}

function getDefaultConfig(network: string): Partial<DCLInfo> {
  const isMainnet = network === 'mainnet'
  return {
    userId: '',
    trackStats: false,
    provider: isDevelopment()
      ? 'https://goerli.infura.io/'
      : 'https://mainnet.infura.io/',
    MANAToken: isMainnet
      ? '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
      : '0xe7fDae84ACaba2A5Ba817B6E6D8A2d415DBFEdbe',
    LANDRegistry: isMainnet
      ? '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d'
      : '0x25b6B4bac4aDB582a0ABd475439dA6730777Fbf7',
    EstateRegistry: isMainnet
      ? '0x959e104e1a4db6317fa58f8295f586e1a978c297'
      : '0xC9A46712E6913c24d15b46fF12221a79c4e251DC',
    catalystUrl: isMainnet
      ? 'https://peer.decentraland.org'
      : 'https://peer.decentraland.zone',
    dclApiUrl: isMainnet
      ? 'https://api.thegraph.com/subgraphs/name/decentraland/land-manager'
      : 'https://api.thegraph.com/subgraphs/name/decentraland/land-manager-goerli',
    segmentKey:
      isStableVersion() && !isDevelopment()
        ? 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
        : 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to'
  }
}

function getDclInfoConfig(): Partial<DCLInfo> {
  const dclInfo = getDCLInfo()
  const fileExists = !!dclInfo
  if (!fileExists) {
    return { fileExists }
  }

  const dclInfoConfig = {
    fileExists,
    userId: dclInfo.userId,
    trackStats: !!dclInfo.trackStats,
    MANAToken: dclInfo.MANAToken,
    LANDRegistry: dclInfo.LANDRegistry,
    EstateRegistry: dclInfo.EstateRegistry,
    catalystUrl: dclInfo.catalystUrl,
    segmentKey: dclInfo.segmentKey
  }

  return removeEmptyKeys(dclInfoConfig)
}

function getEnvConfig(): Partial<DCLInfo> {
  const {
    RPC_URL,
    MANA_TOKEN,
    LAND_REGISTRY,
    ESTATE_REGISTRY,
    CONTENT_URL,
    SEGMENT_KEY
  } = process.env

  const envConfig = {
    provider: RPC_URL,
    MANAToken: MANA_TOKEN,
    LANDRegistry: LAND_REGISTRY,
    EstateRegistry: ESTATE_REGISTRY,
    contentUrl: CONTENT_URL,
    segmentKey: SEGMENT_KEY
  }

  return removeEmptyKeys(envConfig)
}
