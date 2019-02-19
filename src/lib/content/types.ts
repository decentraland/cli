export type MappingsFile = {
  parcel_id: string
  publisher: string
  root_cid: string
  contents: Record<string, string>
  // This mappings field is a backwards compatibility field.
  mappings: Record<string, string>
}
