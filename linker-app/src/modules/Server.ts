import { ICoords } from '../utils/coordinateHelpers'

const ERRORS_MESSAGES = {
  sceneData: 'There was a problem getting scene data.\nTry to re-initialize the project with dcl init.',
  ipns: 'There was a problem getting the IPNS hash of your scene.\nTry to re-upload with dcl upload.'
}

export class Server {
  static async getEnvironment(): Promise<string> {
    const res = await fetch('/api/environment')
    const { env } = await res.json()
    return env
  }

  static async getBaseParcel(): Promise<ICoords> {
    try {
      const res = await fetch('/api/base-parcel')
      return await res.json()
    } catch (err) {
      throw new Error(ERRORS_MESSAGES.sceneData)
    }
  }

  static async getParcels(): Promise<ICoords[]> {
    try {
      const res = await fetch('/api/parcels')
      return await res.json()
    } catch (err) {
      throw new Error(ERRORS_MESSAGES.sceneData)
    }
  }

  static async getOwner(): Promise<string> {
    try {
      const res = await fetch('/api/owner')
      const { address } = await res.json()
      return address
    } catch (err) {
      throw new Error(ERRORS_MESSAGES.sceneData)
    }
  }

  static async getContractAddress(): Promise<string> {
    const res = await fetch('/api/contract-address')
    const { address } = await res.json()
    return address
  }

  static async getIPFSKey(): Promise<any> {
    try {
      const response = await fetch('/api/ipfs-key')
      return await response.json()
    } catch (err) {
      throw new Error(ERRORS_MESSAGES.ipns)
    }
  }

  static async closeServer(ok, message): Promise<void> {
    await fetch(`/api/close?ok=${ok}&reason=${message}`)
  }
}
