import * as React from 'react'

interface IProps {
  isDev: boolean
  value: string
}

export default class Transaction extends React.PureComponent<IProps, any> {
  render() {
    const { value, isDev } = this.props
    const link = isDev ? `https://ropsten.etherscan.io/tx/${value}` : `https://etherscan.io/tx/${value}`
    return (
      <p>
        Transaction:<br />
        <a href={link} target="_blank">
          {link}
        </a>
      </p>
    )
  }
}
