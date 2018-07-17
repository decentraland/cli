import ganache = require('ganache-cli')

export type ConnectionOptions = {
  accounts?: Array<object>
  debug?: boolean
  logger?: object | Function
  mnemonic?: string
  port?: number
  seed?: string
  total_accounts?: number
  fork?: string
  network_id?: number
  time?: Date
  locked?: boolean
  unlocked_accounts?: Array<string>
  db_path?: string
  account_keys_path?: string
  vmErrorsOnRPCResponse?: boolean
}

export class NodeConnectionFactory {
  connectionOptions: ConnectionOptions

  constructor(options?: ConnectionOptions) {
    this.assignConnectionOptions()
  }

  assignConnectionOptions(options?: ConnectionOptions) {
    this.connectionOptions = {
      accounts: [
        {
          balance: 100012300001 /* gas */,
          secretKey: '0x8485898485bbe08a0a9b97fdf695aec8e9f1d196c589d4b6ff50a0232518b682'
        }
      ],
      network_id: 3,
      logger: {
        log(...args) {
          console.log(...args)
        }
      },
      vmErrorsOnRPCResponse: true,
      ...options
    }
  }

  createProvider() {
    return ganache.provider(this.connectionOptions)
  }

  createServer() {
    return ganache.server(this.connectionOptions)
  }
}
