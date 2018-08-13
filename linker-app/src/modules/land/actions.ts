import { action } from 'typesafe-actions'
import { buildTransactionPayload } from 'decentraland-dapps/dist/modules/transaction/utils'

import { ManyLAND, LANDMeta, Coords } from './types'

export const FETCH_LAND_REQUEST = '[Request] Fetch LAND'
export const FETCH_LAND_SUCCESS = '[Success] Fetch LAND'
export const FETCH_LAND_FAILURE = '[Failure] Fetch LAND'

export const fetchLandRequest = (coords: Coords) => action(FETCH_LAND_REQUEST, coords)
export const fetchLandSuccess = (land: LANDMeta) => action(FETCH_LAND_SUCCESS, { land })
export const fetchLandFailure = (error: string) => action(FETCH_LAND_FAILURE, { error })

export type FetchLandRequestAction = ReturnType<typeof fetchLandRequest>
export type FetchLandSuccessAction = ReturnType<typeof fetchLandSuccess>
export type FetchLandFailureAction = ReturnType<typeof fetchLandFailure>

export const UPDATE_LAND_REQUEST = '[Request] Update LAND'
export const UPDATE_LAND_SUCCESS = '[Success] Update LAND'
export const UPDATE_LAND_FAILURE = '[Failure] Update LAND'

export const updateLandRequest = (manyLand: ManyLAND) => action(UPDATE_LAND_REQUEST, manyLand)
export const updateLandSuccess = (tx: string) => action(UPDATE_LAND_SUCCESS, { ...buildTransactionPayload(tx) })
export const updateLandFailure = (error: string) => action(UPDATE_LAND_FAILURE, { error })

export type UpdateLandRequestAction = ReturnType<typeof updateLandRequest>
export type UpdateLandSuccessAction = ReturnType<typeof updateLandSuccess>
export type UpdateLandFailureAction = ReturnType<typeof updateLandFailure>
