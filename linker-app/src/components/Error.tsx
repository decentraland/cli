import * as React from 'react'

export default class Error extends React.PureComponent<any, { children: string }> {
  render() {
    return <p style={{ color: 'red' }}> {this.props.children}</p>
  }
}
