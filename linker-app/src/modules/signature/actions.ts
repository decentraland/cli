import { action } from 'typesafe-actions'

export const SIGN_CONTENT_REQUEST = '[Request] Sign Content'
export const SIGN_CONTENT_SUCCESS = '[Success] Sign Content'
export const SIGN_CONTENT_FAILURE = '[Failure] Sign Content'

export const signContentRequest = (cid: string) => action(SIGN_CONTENT_REQUEST, cid)
export const signContentSuccess = (signature: string) => action(SIGN_CONTENT_SUCCESS, { signature })
export const signContentFailure = (error: string) => action(SIGN_CONTENT_FAILURE, { error })

export type SignContentRequestAction = ReturnType<typeof signContentRequest>
export type SignContentSuccessAction = ReturnType<typeof signContentSuccess>
export type SignContentFailureAction = ReturnType<typeof signContentFailure>
