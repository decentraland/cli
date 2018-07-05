import * as React from 'react'

export default class Transaction extends React.PureComponent<{ value: string }, any> {
  render() {
    const { value } = this.props
    return (
      <p>
        Transaction:<br />
        <a href={`https://etherscan.io/tx/${value}`} target="_blank">
          {`https://etherscan.io/tx/${value}`}
        </a>
      </p>
    )
  }
}
