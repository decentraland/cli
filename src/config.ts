import chalk from 'chalk'
import * as path from 'path'

import { fail, ErrorType } from './utils/errors'
import { readJSON, writeJSON, getUserHome } from './utils/filesystem'
import { removeEmptyKeys } from './utils'

export type DCLInfo = {
  fileExists?: boolean
  userId: string
  trackStats: boolean
  MANAToken?: string
  LANDRegistry?: string
  EstateRegistry?: string
  contentUrl?: string
  segmentKey?: string
}

let networkFlag = null
let config: DCLInfo = null

/**
 * Returns the path to the `.dclinfo` file located in the local HOME folder
 */
function getDCLInfoPath(): string {
  return path.resolve(getUserHome(), '.dclinfo')
}

/**
 * Reads the contents of the `.dclinfo` file
 */
async function readDCLInfo(): Promise<DCLInfo> {
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
  config = await readDCLInfo()
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
  const isMainnet = !network || network === 'mainnet'

  if (!network && !isMainnet && network !== 'ropsten') {
    fail(
      ErrorType.PROJECT_ERROR,
      `The only available values for ${chalk.bold(
        `'--network'`
      )} are ${chalk.bold(`'mainnet'`)} or ${chalk.bold(`'ropsten'`)}`
    )
  }

  return {
    userId: null,
    trackStats: false,
    MANAToken: isMainnet
      ? '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
      : '0x2a8fd99c19271f4f04b1b7b9c4f7cf264b626edb',
    LANDRegistry: isMainnet
      ? '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d'
      : '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75b',
    EstateRegistry: isMainnet
      ? '0x959e104e1a4db6317fa58f8295f586e1a978c297'
      : '0x124bf28a423b2ca80b3846c3aa0eb944fe7ebb95',
    contentUrl: isMainnet
      ? 'https://content.decentraland.org'
      : 'https://content.decentraland.zone',
    segmentKey: 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
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
    contentUrl: dclInfo.contentUrl,
    segmentKey: dclInfo.segmentKey
  }

  return removeEmptyKeys(dclInfoConfig)
}

function getEnvConfig(): Partial<DCLInfo> {
  const {
    MANA_TOKEN,
    LAND_REGISTRY,
    ESTATE_REGISTRY,
    CONTENT_URL,
    SEGMENT_KEY
  } = process.env

  const envConfig = {
    MANAToken: MANA_TOKEN,
    LANDRegistry: LAND_REGISTRY,
    EstateRegistry: ESTATE_REGISTRY,
    contentUrl: CONTENT_URL,
    segmentKey: SEGMENT_KEY
  }

  return removeEmptyKeys(envConfig)
}
