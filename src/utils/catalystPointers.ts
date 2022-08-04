import { Entity } from '@dcl/schemas'
import fetch from 'node-fetch'

export type DAOCatalyst = {
  baseUrl: string
  owner: string
  id: string
}

type CatalystInfo = {
  url: string
  timestamp: number
  entityId: string
}

export type Network = 'mainnet' | 'ropsten'

export async function daoCatalysts(
  network: Network = 'mainnet'
): Promise<Array<DAOCatalyst>> {
  const tld = network === 'mainnet' ? 'org' : 'zone'
  const resp = await (
    await fetch(`https://peer.decentraland.${tld}/lambdas/contracts/servers`)
  ).json()
  return resp
}

async function fetchEntityByPointer(baseUrl: string, pointer: string) {
  const activeEntities = baseUrl + '/content/entities/active'

  const response = await fetch(activeEntities, {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pointers: [pointer] })
  })

  const deployments: Entity[] = response.ok ? await response.json() : []

  return {
    baseUrl,
    deployments
  }
}

export async function getPointers(
  pointer: string,
  network: Network = 'mainnet'
) {
  const catalysts = await daoCatalysts(network)
  const catalystInfo: CatalystInfo[] = []

  for (const { baseUrl } of catalysts) {
    try {
      const result = await fetchEntityByPointer(baseUrl, pointer)
      const timestamp = result.deployments[0]?.timestamp
      const entityId = result.deployments[0]?.id || ''

      catalystInfo.push({ timestamp, entityId, url: baseUrl })
    } catch (err: any) {
      console.log('Error fetching catalyst pointers', err)
    }
  }

  return catalystInfo
}
