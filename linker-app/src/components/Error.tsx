import * as React from 'react'

export default class Error extends React.PureComponent<{ children: string }, any> {
  render() {
    return <p style={{ color: 'var(--primary)' }}> Error: {this.props.children}</p>
  }
}
