import { EventEmitter } from 'events'
import events from 'wildcards'
import { ErrorType, fail } from '../utils/errors'
import { DCLInfo, getConfig } from '../config'
import { LinkerResponse } from './LinkerAPI'
import {
  ethSign,
  recoverAddressFromEthSignature
} from '@dcl/crypto/dist/crypto'
import { IdentityType } from '@dcl/crypto'
import { hexToBytes } from 'eth-connect'
import { WorldsContentServerLinkerAPI } from './WorldsContentServerLinkerAPI'
import { EthAddress } from '@dcl/schemas'

export type WorldsContentServerArguments = {
  worldName: string
  allowed: EthAddress[]
  old_allowed: EthAddress[]
  targetContent: string
  linkerPort?: number
  isHttps?: boolean
  config?: DCLInfo
}

export class WorldsContentServer extends EventEmitter {
  options: WorldsContentServerArguments
  targetContent: string
  environmentIdentity?: IdentityType

  constructor(args: WorldsContentServerArguments) {
    super()
    this.options = args
    this.options.config = this.options.config || getConfig()
    this.targetContent = args.targetContent
    if (process.env.DCL_PRIVATE_KEY) {
      this.createWallet(process.env.DCL_PRIVATE_KEY)
    }
  }

  async link(payload: string): Promise<LinkerResponse> {
    return new Promise<LinkerResponse>(async (resolve, reject) => {
      const linker = new WorldsContentServerLinkerAPI({
        worldName: this.options.worldName,
        allowed: this.options.allowed,
        old_allowed: this.options.old_allowed,
        targetContent: this.options.targetContent,
        payload
      })
      events(linker, '*', this.pipeEvents.bind(this))
      linker.on('link:success', async (message: LinkerResponse) => {
        resolve(message)
      })

      try {
        await linker.link(this.options.linkerPort!, !!this.options.isHttps)
      } catch (e) {
        reject(e)
      }
    })
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
