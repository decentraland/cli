import { createSelector } from 'reselect'
import { RootState } from '../../types'

export const getState = (state: RootState) => state.signature
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
