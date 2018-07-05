import * as React from 'react'

export default class Error extends React.PureComponent<{ children: string }, any> {
  render() {
    return <p style={{ color: 'red' }}> {this.props.children}</p>
  }
}
