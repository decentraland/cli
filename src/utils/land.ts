import { LANDData } from '../lib/Ethereum'

export function filterAndFillEmpty(data: any, def: string = null): LANDData {
  if (!data) {
    return { name: def, description: def }
  }

  return { name: data.name || def, description: data.description || def }
}
