import { action } from 'typesafe-actions'
import { Authorization } from './types'

export const FETCH_AUTHORIZATIONS_REQUEST =
  '[Request] Fetch LAND Authorizations'
export const FETCH_AUTHORIZATIONS_SUCCESS =
  '[Success] Fetch LAND Authorizations'
export const FETCH_AUTHORIZATIONS_FAILURE =
  '[Failure] Fetch LAND Authorizations'

export const fetchAuthorizationsRequest = (owner: string) =>
  action(FETCH_AUTHORIZATIONS_REQUEST, { owner })

export const fetchAuthorizationsSuccess = (authorizations: Authorization[]) =>
  action(FETCH_AUTHORIZATIONS_SUCCESS, { authorizations })

export const fetchAuthorizationsFailure = (error: string) =>
  action(FETCH_AUTHORIZATIONS_FAILURE, { error })

export type FetchAuthorizationsRequestAction = ReturnType<
  typeof fetchAuthorizationsRequest
>
export type FetchAuthorizationsSuccessAction = ReturnType<
  typeof fetchAuthorizationsSuccess
>
export type FetchAuthorizationsFailureAction = ReturnType<
  typeof fetchAuthorizationsFailure
>
