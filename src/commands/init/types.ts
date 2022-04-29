import { sdk } from '@dcl/schemas'

export type InitOptionProjectType = {
  type: 'project'
  value: sdk.ProjectType
}

export type InitOptionRepositoryURL = {
  type: 'scene'
  value: string
}

export type InitOption = InitOptionProjectType | InitOptionRepositoryURL

export type RepositoryJson = {
  scenes: { title: string; url: string }[]
  library: string
  portableExperience: string
  smartItem: string
}
