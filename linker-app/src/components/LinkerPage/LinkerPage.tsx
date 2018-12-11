import * as React from 'react'
import { Address, Blockie, Header, Button, Loader } from 'decentraland-ui'
import Navbar from 'decentraland-dapps/dist/containers/Navbar'

import { baseParcel, isDevelopment, rootCID } from '../../modules/config'
import Error from '../Error'
import { LinkerPageProps } from './types'

export default class LinkScenePage extends React.PureComponent<LinkerPageProps, any> {
  constructor(props) {
    super(props)
  }

  handleSignature = e => {
    e.preventDefault()
    const { onSignContent } = this.props
    onSignContent(rootCID)
  }

  render() {
    const { wallet, error, base, isLandLoading, isConnected, isConnecting, onConnectWallet } = this.props
    const { x, y } = baseParcel
    return (
      <div className="LinkScenePage">
        <Navbar />
        <Header>Update LAND data</Header>
        {isConnected ? (
          <p>
            Using {wallet.type === 'node' ? 'MetaMask' : wallet.type} address: &nbsp;
            <Blockie scale={3} seed={wallet.address}>
              <Address tooltip strong value={wallet.address} />
            </Blockie>
          </p>
        ) : (
          <React.Fragment>
            {isConnecting ? null : <p>Could not find any wallet</p>}
            <p>
              <Button primary onClick={onConnectWallet} loading={isConnecting || isLandLoading} disabled={isConnecting}>
                Reconnect{' '}
              </Button>
            </p>
          </React.Fragment>
        )}
        <img
          className="map"
          src={`https://api.decentraland.${isDevelopment() ? 'zone' : 'org'}/v1/parcels/${x}/${y}/map.png`}
          alt={`Base parcel ${x},${y}`}
        />
        {!error && (isConnected || isConnecting) ? (
          isLandLoading || isConnecting ? (
            <Loader active />
          ) : (
            <p>
              Updating <b>{base.name ? `"${base.name}"` : `LAND without name`}</b> at coordinates{' '}
              <b>
                {x}, {y}
              </b>
            </p>
          )
        ) : null}
        <p>
          Project CID: <b>{rootCID}</b>
        </p>
        <form>
          <div>
            <Button primary onClick={this.handleSignature} disabled={!isConnected || !!error}>
              Sign and Deploy
            </Button>
          </div>
        </form>
        {error ? <Error>{error}</Error> : null}
        <style>{`
          .LinkScenePage {
            text-align: center;
          }
          .map {
            padding: 15px;
          }
          .options div input {
            color: white;
          }
        `}</style>
        {isDevelopment() ? (
          <style>{`
            body:before {
              content: 'Using Ropsten test network';
              background: var(--primary);
              color: white;
              text-align: center;
              text-transform: uppercase;
              height: 24px;
              width: 100%;
              position: fixed;
              padding-top: 2px;
            }
            .LinkScenePage {
              padding-top: 24px;
            }
          `}</style>
        ) : null}
      </div>
    )
  }
}
