import * as React from 'react'

export default class TransactionStatus extends React.PureComponent<any, { loading: boolean }> {
  render() {
    return this.props.loading ? (
      <div>
        <p style={{ color: 'orange' }}>{`Transaction pending. This will take a while...`}</p>
        <p style={{ fontSize: 10 }}>{`This window will be closed when the transaction is completed successfully.`}</p>
      </div>
    ) : (
      <p style={{ color: 'green' }}>{`Transaction confirmed`}</p>
    )
  }
}
