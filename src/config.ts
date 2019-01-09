import chalk from 'chalk'

import { getDCLInfo } from './utils/dclinfo'
import { fail, ErrorType } from './utils/errors'

export type EnvConfig = {
  MANA_TOKEN: string
  LAND_REGISTRY: string
  ESTATE_REGISTRY: string
  CONTENT_URL: string
}

export async function getConfig(network: string): Promise<EnvConfig> {
  const dclInfo = await getDCLInfo()
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
    MANA_TOKEN:
      process.env.MANA_TOKEN || dclInfo.MANAToken || isMainnet
        ? '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
        : '0x2a8fd99c19271f4f04b1b7b9c4f7cf264b626edb',
    LAND_REGISTRY:
      process.env.LAND_REGISTRY || dclInfo.LANDRegistry || isMainnet
        ? '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d'
        : '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75b',
    ESTATE_REGISTRY:
      process.env.ESTATE_REGISTRY || dclInfo.EstateRegistry || isMainnet
        ? '0x959e104e1a4db6317fa58f8295f586e1a978c297'
        : '0x124bf28a423b2ca80b3846c3aa0eb944fe7ebb95',
    CONTENT_URL:
      process.env.CONTENT_URL || dclInfo.ContentUrl || isMainnet
        ? 'https://content.decentraland.today'
        : 'https://content.decentraland.zone'
  }
}
