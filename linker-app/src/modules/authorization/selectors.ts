import { createSelector } from 'reselect'

import { RootState } from '../../types'
import { Authorization } from './types'

export const getState = (state: RootState) => state.authorization

export const getData = createSelector(
  getState,
  state => state.data
)

export const isLoading = createSelector(
  getState,
  state => state.loading.length > 0
)

export const getError = createSelector(
  getState,
  state => state.error
)

export const isUpdateAuthorized = createSelector(
  getData,
  authorizations => {
    if (!authorizations) {
      return
    }

    return authorizations.every((a: Authorization) => a.isUpdateAuthorized)
  }
)
