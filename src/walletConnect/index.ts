import Connector from '@walletconnect/core'
import { IWalletConnectOptions } from '@walletconnect/types'

import * as crypto from './crypto'

export class WalletConnect extends Connector {
  constructor(opts: IWalletConnectOptions) {
    super(crypto, opts)
  }
}
