export type Coords = {
  x: number
  y: number
}

export type LANDMeta = {
  version: number
  name: string
  description: string
}

export type LAND = LANDMeta & {
  isUpdateAuthorized: boolean
}
