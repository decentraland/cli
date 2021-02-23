import { LANDData } from './Ethereum'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { Coords } from '../utils/coordinateHelpers'
import { getConfig } from '../config'
import { Fetcher } from 'dcl-catalyst-commons'

const { dclApiUrl } = getConfig()

export class API implements IEthereumDataProvider {
  private readonly fetcher: Fetcher = new Fetcher()

  async getEstateIdOfLand({ x, y }: Coords): Promise<number> {
    const query = `query GetEstateIdOfLand($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        estate {
          id
        }
      }
    }`
    type ResultType = { parcels: { estate: { id: string } | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, { x, y })
    const estate = response.parcels[0].estate
    return estate ? parseInt(estate.id, 10) : undefined
  }

  async getEstateData(estateId: number): Promise<LANDData> {
    const query = `query GetEstateData($estateId: String!) {
      estates(where:{ id: $estateId }) {
        data {
          name
          description
        }
      }
    }`
    type ResultType = { estates: { data: { name: string; description: string } | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      estateId: `${estateId}`
    })
    return response.estates[0].data ? response.estates[0].data : { name: '', description: '' }
  }
  async getEstateOwner(estateId: number): Promise<string> {
    const query = `query GetEstateOwner($estateId: String!) {
      estates(where:{ id: $estateId }) {
        owner {
          address
        }
      }
    }`
    type ResultType = { estates: { owner: { address: string } }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      estateId: `${estateId}`
    })
    return response.estates[0].owner.address
  }

  async getEstateOperator(estateId: number): Promise<string> {
    const query = `query GetEstateOperator($estateId: String!) {
      estates(where:{ id: $estateId }) {
        operator
      }
    }`
    type ResultType = { estates: { operator: string | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      estateId: `${estateId}`
    })
    return response.estates[0].operator
  }

  async getEstateUpdateOperator(estateId: number): Promise<string> {
    const query = `query GetEstateUpdateOperator($estateId: String!) {
      estates(where:{ id: $estateId }) {
        updateOperator
      }
    }`
    type ResultType = { estates: { updateOperator: string | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      estateId: `${estateId}`
    })
    return response.estates[0].updateOperator
  }

  async getLandOfEstate(estateId: number): Promise<Coords[]> {
    const query = `query GetLandOfEstate($estateId: String!) {
      estates(where:{ id: $estateId }) {
        parcels {
          x
          y
        }
      }
    }`
    type ResultType = { estates: { parcels: { x: string; y: string }[] }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      estateId: `${estateId}`
    })
    return response.estates[0].parcels.map(parcel => ({
      x: parseInt(parcel.x, 10),
      y: parseInt(parcel.y, 10)
    }))
  }

  async getLandData({ x, y }: Coords): Promise<LANDData> {
    const query = `query GetLandOwner($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        data {
          name
          description
          version
        }
      }
    }`
    type ResultType = { parcels: { data: { name: string; description: string } | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, { x, y })
    return response.parcels[0].data ? response.parcels[0].data : { name: '', description: '' }
  }

  async getLandOwner({ x, y }: Coords): Promise<string> {
    const query = `query GetLandOwner($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        owner {
          address
        }
      }
    }`
    type ResultType = { parcels: { owner: { address: string } }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, { x, y })
    return response.parcels[0].owner.address
  }

  async getLandOperator({ x, y }: Coords): Promise<string> {
    const query = `query GetLandOperator($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        operator
      }
    }`
    type ResultType = { parcels: { operator: string }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, { x, y })
    return response.parcels[0].operator
  }

  async getLandUpdateOperator({ x, y }: Coords): Promise<string> {
    const query = `query GetLandUpdateOperator($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        updateOperator
      }
    }`
    type ResultType = { parcels: { updateOperator: string }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, { x, y })
    return response.parcels[0].updateOperator
  }

  async getLandOf(owner: string): Promise<Coords[]> {
    const query = `query GetLandOf($owner: String!) {
      parcels(where: { owner: $owner }) {
        x
        y
      }
    }`
    type ResultType = { parcels: { x: string; y: string }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      owner: owner.toLowerCase()
    })
    return response.parcels.map(({ x, y }) => ({ x: parseInt(x, 10), y: parseInt(y, 10) }))
  }

  async getEstatesOf(owner: string): Promise<number[]> {
    const query = `query GetEstatesOf($owner: String!) {
      estates(where: { owner: $owner }) {
        id
      }
    }`
    type ResultType = { estates: { id: string }[] }
    const response = await this.fetcher.queryGraph<ResultType>(dclApiUrl, query, {
      owner: owner.toLowerCase()
    })
    return response.estates.map(({ id }) => parseInt(id, 10))
  }
}
