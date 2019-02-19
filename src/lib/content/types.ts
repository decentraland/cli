export type ContentPair = {
  file: string
  hash: string
}

export type MappingsFile = {
  parcel_id: string
  publisher: string
  root_cid: string
  contents: ContentPair[]
  // This mappings field is a backwards compatibility field.
  mappings: Record<string, string>
}
