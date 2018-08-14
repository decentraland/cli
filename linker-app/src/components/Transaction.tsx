import * as React from 'react'
import EtherscanLink from 'decentraland-dapps/dist/containers/EtherscanLink'
import { Transaction as TransactionType } from 'decentraland-dapps/dist/modules/transaction/types'

import TransactionStatus from './TransactionStatus'

interface IProps {
  value: TransactionType
}

export default class Transaction extends React.PureComponent<IProps, any> {
  render() {
    const { value } = this.props
    return (
      <React.Fragment>
        <p>
          Transaction:
          <br />
          <EtherscanLink txHash={value.hash} />
        </p>
        <TransactionStatus loading={value.status === 'pending'} />
      </React.Fragment>
    )
  }
}
