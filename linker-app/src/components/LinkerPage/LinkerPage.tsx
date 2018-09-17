import * as React from 'react'
import { Address, Blockie, Header, Button, Loader } from 'decentraland-ui'
import Navbar from 'decentraland-dapps/dist/containers/Navbar'

import Error from '../Error'
import { LinkerPageProps, LinkerPageState } from './types'
import { baseParcel, estateId, ipfsKey, isDevelopment, isEstate } from '../../modules/config'
import Transaction from '../Transaction'

export default class LinkScenePage extends React.PureComponent<LinkerPageProps, LinkerPageState> {
  constructor(props) {
    super(props)
  }

  handleDeploy = e => {
    e.preventDefault()
    const { onUpdateLand, target } = this.props
    onUpdateLand(target)
  }

  render() {
    const { wallet, transaction, isLoading, error, target } = this.props
    const { x, y } = baseParcel
    return (
      <div className="LinkScenePage">
        <Navbar />
        {isLoading ? (
          <Loader active size="massive" />
        ) : error ? (
          <Error>{error}</Error>
        ) : (
          <React.Fragment>
            <Header>Update {isEstate() ? 'Estate' : 'LAND'} data</Header>

            <p>
              Using {wallet.type === 'node' ? 'MetaMask' : wallet.type} address: &nbsp;
              <Blockie scale={3} seed={wallet.address}>
                <Address tooltip strong value={wallet.address} />
              </Blockie>
            </p>

            <img
              className="map"
              src={`https://api.decentraland.${isDevelopment() ? 'zone' : 'org'}/v1/${
                isEstate() ? `estates/${estateId}` : `parcels/${x}/${y}`
              }/map.png`}
              alt={`Base parcel ${x},${y}`}
            />

            <p>
              Updating <b>{target.name ? `"${target.name}"` : `${isEstate() ? 'Estate' : 'LAND'} without name`}</b>{' '}
              {isEstate() ? (
                <React.Fragment>
                  with ID: <b>{estateId}</b>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  at coordinates{' '}
                  <b>
                    {baseParcel.x}, {baseParcel.y}
                  </b>
                </React.Fragment>
              )}
            </p>

            <p>
              Linking to IPNS: <b>{ipfsKey}</b>
            </p>

            <form>
              <div>
                <Button primary onClick={this.handleDeploy}>
                  Deploy
                </Button>
              </div>
            </form>

            {transaction ? <Transaction value={transaction} /> : null}
          </React.Fragment>
        )}
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
