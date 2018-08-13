import * as React from 'react'

interface IProps {
  isRopsten: boolean
  value: string
}

export default class Transaction extends React.PureComponent<IProps, any> {
  render() {
    const { value, isRopsten } = this.props
    const link = isRopsten ? `https://ropsten.etherscan.io/tx/${value}` : `https://etherscan.io/tx/${value}`
    return (
      <p>
        Transaction:
        <br />
        <a href={link} target="_blank">
          {link}
        </a>
      </p>
    )
  }
}
