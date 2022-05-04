import { sdk } from '@dcl/schemas'

type URL = string

export type InitOptionProjectType = {
  type: 'project'
  value: sdk.ProjectType
}

export type InitOptionRepositoryURL = {
  type: 'scene'
  value: URL
}

export type InitOption = InitOptionProjectType | InitOptionRepositoryURL

export type RepositoryJson = {
  scenes: { title: string; url: string }[]
  library: string
  portableExperience: string
  smartItem: string
}
