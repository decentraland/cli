import { LANDData } from '../lib/Ethereum'

export function filterAndFillEmpty(data: any): LANDData {
  if (!data) {
    return data
  }

  return { name: data.name ? data.name : '', description: data.description ? data.description : '', ipns: data.ipns ? data.ipns : '' }
}
