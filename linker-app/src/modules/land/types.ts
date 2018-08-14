export type Coords = {
  x: number
  y: number
}

export type LANDMeta = {
  version: number
  name: string
  description: string
  ipns: string
}

export type ManyLAND = {
  base: LANDMeta
  parcels: Coords[]
}
