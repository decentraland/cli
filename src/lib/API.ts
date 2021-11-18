import { LANDData } from './Ethereum'
import { IEthereumDataProvider } from './IEthereumDataProvider'
import { Coords } from '../utils/coordinateHelpers'
import { getConfig } from '../config'
import { Fetcher } from 'dcl-catalyst-commons'

const dclApiUrl = getConfig().dclApiUrl!

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
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      { x, y }
    )
    const estate = response.parcels[0].estate
    if (!estate) throw new Error('No estate provided')
    return parseInt(estate.id, 10)
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
    type ResultType = {
      estates: { data: { name: string; description: string } | null }[]
    }
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      {
        estateId: `${estateId}`
      }
    )
    return response.estates[0].data
      ? response.estates[0].data
      : { name: '', description: '' }
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
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      {
        estateId: `${estateId}`
      }
    )
    return response.estates[0].owner.address
  }

  async getEstateOperator(estateId: number): Promise<string> {
    const query = `query GetEstateOperator($estateId: String!) {
      estates(where:{ id: $estateId }) {
        operator
      }
    }`
    type ResultType = { estates: { operator: string | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      {
        estateId: `${estateId}`
      }
    )
    return response.estates[0].operator!
  }

  async getEstateUpdateOperator(estateId: number): Promise<string> {
    const query = `query GetEstateUpdateOperator($estateId: String!) {
      estates(where:{ id: $estateId }) {
        updateOperator
      }
    }`
    type ResultType = { estates: { updateOperator: string | null }[] }
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      {
        estateId: `${estateId}`
      }
    )
    return response.estates[0].updateOperator!
  }

  // This is a special case, because some estates have +10000 parcels, and TheGraph doesn't support offsets of more than 5000
  async getLandOfEstate(estateId: number): Promise<Coords[]> {
    const query = `query GetLandOfEstate($estateId: String!, $first: Int!, $lastId: String!) {
      estates(where: { id: $estateId }) {
        parcels (where:{ id_gt: $lastId }, first: $first, orderBy: id) {
          x
          y
          id
        }
      }
    }`
    type ResultType = {
      estates: { parcels: { x: string; y: string; id: string }[] }[]
    }
    const response = await this.queryGraphPaginated<
      ResultType,
      { x: string; y: string; id: string }
    >(query, { estateId: `${estateId}` }, (result) => result.estates[0].parcels)

    return response.map((parcel) => ({
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
    type ResultType = {
      parcels: { data: { name: string; description: string } | null }[]
    }
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      { x, y }
    )
    return response.parcels[0].data
      ? response.parcels[0].data
      : { name: '', description: '' }
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
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      { x, y }
    )
    return response.parcels[0].owner.address
  }

  async getLandOperator({ x, y }: Coords): Promise<string> {
    const query = `query GetLandOperator($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        operator
      }
    }`
    type ResultType = { parcels: { operator: string }[] }
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      { x, y }
    )
    return response.parcels[0].operator
  }

  async getLandUpdateOperator({ x, y }: Coords): Promise<string> {
    const query = `query GetLandUpdateOperator($x: Int!, $y: Int!) {
      parcels(where: { x: $x, y: $y }) {
        updateOperator
      }
    }`
    type ResultType = { parcels: { updateOperator: string }[] }
    const response = await this.fetcher.queryGraph<ResultType>(
      dclApiUrl,
      query,
      { x, y }
    )
    return response.parcels[0].updateOperator
  }

  async getLandOf(owner: string): Promise<Coords[]> {
    const query = `query GetLandOf($owner: String!, $first: Int!, $lastId: String!) {
      parcels(where: { owner: $owner, id_gt: $lastId }, first: $first, orderBy: id) {
        id
        x
        y
      }
    }`
    type ResultType = { parcels: { x: string; y: string; id: string }[] }
    const response = await this.queryGraphPaginated<
      ResultType,
      { x: string; y: string; id: string }
    >(query, { owner: owner.toLowerCase() }, (result) => result.parcels)
    return response.map(({ x, y }) => ({
      x: parseInt(x, 10),
      y: parseInt(y, 10)
    }))
  }

  async getEstatesOf(owner: string): Promise<number[]> {
    const query = `query GetEstatesOf($owner: String!, $first: Int!, $lastId: String!) {
      estates(where: { owner: $owner, id_gt: $lastId }, first: $first, orderBy: id) {
        id
      }
    }`
    type ResultType = { estates: { id: string }[] }
    const response = await this.queryGraphPaginated<ResultType, { id: string }>(
      query,
      { owner: owner.toLowerCase() },
      (result) => result.estates
    )
    return response.map(({ id }) => parseInt(id, 10))
  }

  /**
   * We are making paginated queries to the subgraph, sorting by id and asking for the next ones
   */
  private async queryGraphPaginated<
    QueryResultType,
    ArrayType extends { id: string }
  >(
    query: string,
    variables: Record<string, any>,
    extractArray: (queryResult: QueryResultType) => ArrayType[]
  ): Promise<ArrayType[]> {
    const pageSize = 1000
    let lastId: string | undefined = ''
    let keepGoing = true

    const finalResult: ArrayType[] = []
    while (keepGoing) {
      const result = await this.fetcher.queryGraph<QueryResultType>(
        dclApiUrl,
        query,
        {
          ...variables,
          first: pageSize,
          lastId
        }
      )
      const array = extractArray(result)
      keepGoing = array.length === pageSize
      lastId = array.length > 0 ? array[array.length - 1].id : undefined
      finalResult.push(...array)
    }

    return finalResult
  }
}
