import { MappingsFile } from 'src/lib/content/types'

export default function getDummyMappings(filePaths: string[]): MappingsFile {
  const mappings = filePaths.reduce((acc, f) => {
    acc[f] = f
    return acc
  }, {}) as Record<string, string>

  return {
    mappings,
    contents: Object.entries(mappings).map(([file, hash]) => ({ file, hash })),
    parcel_id: '0,0',
    publisher: '0x0000000000000000000000000000000000000000',
    root_cid: 'Qm0000000000000000000000000000000000000000'
  }
}
