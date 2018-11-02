import { action } from 'typesafe-actions'
import { LANDMeta, Coords } from './types'

export const FETCH_LAND_REQUEST = '[Request] Fetch LAND'
export const FETCH_LAND_SUCCESS = '[Success] Fetch LAND'
export const FETCH_LAND_FAILURE = '[Failure] Fetch LAND'

export const fetchLandRequest = (coords: Coords | number) => action(FETCH_LAND_REQUEST, coords)
export const fetchLandSuccess = (land: LANDMeta) => action(FETCH_LAND_SUCCESS, { land })
export const fetchLandFailure = (error: string) => action(FETCH_LAND_FAILURE, { error })

export type FetchLandRequestAction = ReturnType<typeof fetchLandRequest>
export type FetchLandSuccessAction = ReturnType<typeof fetchLandSuccess>
export type FetchLandFailureAction = ReturnType<typeof fetchLandFailure>

export const SIGN_CONTENT_REQUEST = '[Request] Sign Content'
export const SIGN_CONTENT_SUCCESS = '[Success] Sign Content'
export const SIGN_CONTENT_FAILURE = '[Failure] Sign Content'

export const signContentRequest = (cid: string) => action(SIGN_CONTENT_REQUEST, cid)
export const signContentSuccess = (signature: string) => action(SIGN_CONTENT_SUCCESS, signature)
export const signContentFailure = (error: string) => action(SIGN_CONTENT_FAILURE, { error })

export type SignContentRequestAction = ReturnType<typeof signContentRequest>
export type SignContentSuccessAction = ReturnType<typeof signContentSuccess>
export type SignContentFailureAction = ReturnType<typeof signContentFailure>
