import { LANDData } from '../lib/Ethereum'

export function filterAndFillEmpty(data: any, def: string = null): LANDData {
  if (!data) {
    return data
  }

  return { name: data.name ? data.name : def, description: data.description ? data.description : def }
}
