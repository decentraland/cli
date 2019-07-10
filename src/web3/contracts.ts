export async function getLANDRegistry(): Promise<any> {
  return {
    lastActive: (x, y) => (x === 3 && y === 3 ? '06/06/2019' : '06/03/2019')
  }
}

export async function getDecayedAssetAuction(): Promise<any> {
  return {
    getPriceOf: () => 25000
  }
}
