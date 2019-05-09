import { LANDData } from './Ethereum'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { Coords } from '../utils/coordinateHelpers'
import { fail, ErrorType } from '../utils/errors'
import { filterAndFillEmpty } from '../utils/land'
import { getConfig } from '../config'

const { dclApiUrl } = getConfig()

const cache = new Map<string, any>()

async function request(url) {
  const cached = cache.get(url)
  if (cached) {
    return cached
  }

  try {
    const res = await fetch(url)
    const json = await res.json()
    cache.set(url, json)
    return json
  } catch (e) {
    fail(ErrorType.API_ERROR, `Unable to fetch from Decentraland remote API: ${e.message}`)
  }
}

export class API implements IEthereumDataProvider {
  async getEstateIdOfLand({ x, y }: Coords): Promise<number> {
    const json = await request(`${dclApiUrl}/parcels/${x}/${y}`)
    if (!json.data) {
      return
    }

    return json.data.estate_id
  }

  async getEstateData(estateId: number): Promise<LANDData> {
    const json = await request(`${dclApiUrl}/estates/${estateId}`)
    if (!json.data) {
      return
    }

    return filterAndFillEmpty(json.data.data)
  }
  async getEstateOwner(estateId: number): Promise<string> {
    const json = await request(`${dclApiUrl}/estates/${estateId}`)
    if (!json.data) {
      return
    }

    return json.data.owner
  }

  async getLandOfEstate(estateId: number): Promise<Coords[]> {
    const json = await request(`${dclApiUrl}/estates/${estateId}`)
    if (!json.data) {
      return
    }

    return json.data.data.parcels
  }

  async getLandData({ x, y }: Coords): Promise<LANDData> {
    const json = await request(`${dclApiUrl}/parcels/${x}/${y}`)
    if (!json.data) {
      return
    }

    return filterAndFillEmpty(json.data.data)
  }

  async getLandOwner({ x, y }: Coords): Promise<string> {
    const json = await request(`${dclApiUrl}/parcels/${x}/${y}`)
    if (!json.data) {
      return
    }

    return json.data.owner
  }

  async getLandOf(owner: string): Promise<Coords[]> {
    const json = await request(`${dclApiUrl}/addresses/${owner}/parcels`)
    if (!json.data) {
      return
    }

    return json.data.map(({ x, y }) => ({ x, y }))
  }

  async getEstatesOf(owner: string): Promise<number[]> {
    const json = await request(`${dclApiUrl}/addresses/${owner}/estates`)
    if (!json.data) {
      return
    }

    return json.data.map(({ id }) => id)
  }
}
