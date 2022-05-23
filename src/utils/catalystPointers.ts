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
  return {
    baseUrl,
    deployments: (await fetch(
      `${baseUrl}/content/deployments?pointer=${encodeURIComponent(
        pointer
      )}&onlyCurrentlyPointed=true`
    )
      .then(($) => $.json())
      .then(($) => $.deployments)) as Array<{
      entityId: string
      entityVersion: string
      entityType: string
      entityTimestamp: number
      localTimestamp: number
      metadata: unknown
      pointers: string[]
      content: { key: string; hash: string }[]
    }>
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
      const timestamp = result.deployments[0]?.localTimestamp
      const entityId = result.deployments[0]?.entityId || ''

      catalystInfo.push({ timestamp, entityId, url: baseUrl })
    } catch (err: any) {
      console.log('Error fetching catalyst pointers', err)
    }
  }

  return catalystInfo
}
