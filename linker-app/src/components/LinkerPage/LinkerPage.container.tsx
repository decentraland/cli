import { connect } from 'react-redux'

import { RootState, RootDispatch } from '../../types'
import { getData as getConfig } from '../../modules/config/selectors'
import LinkerPage from './LinkerPage'
import { LinkerPageProps } from './types'
import { fetchConfigRequest } from '../../modules/config/actions'
import { ConfigReducerAction } from '../../modules/config/reducer'

const mapState = (state: RootState, ownProps: LinkerPageProps): LinkerPageProps => {
  const { isDev } = getConfig(state)
  return { ...ownProps, isDev }
}

const mapDispatch = (dispatch: RootDispatch<ConfigReducerAction>) => ({
  onFetchConfig: () => dispatch(fetchConfigRequest())
})

export default connect<LinkerPageProps>(
  mapState,
  mapDispatch
)(LinkerPage)
