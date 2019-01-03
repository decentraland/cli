import { Coords } from '../land/types'

export type Authorization = Coords & {
  isUpdateAuthorized: boolean
}
