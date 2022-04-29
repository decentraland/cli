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
