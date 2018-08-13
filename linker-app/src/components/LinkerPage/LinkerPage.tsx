import * as React from 'react'
import { Address, Blockie, Header, Button, Loader } from 'decentraland-ui'
import Navbar from 'decentraland-dapps/dist/containers/Navbar'

import Error from '../Error'
import { LinkerPageProps, LinkerPageState } from './types'
import { baseParcel, parcels, isDevelopment } from '../../modules/config'
import { getString, isEqual } from '../../modules/land/utils'
import Transaction from '../Transaction'

export default class LinkScenePage extends React.PureComponent<LinkerPageProps, LinkerPageState> {
  constructor(props) {
    super(props)
    this.state = {
      options: parcels.map(parcel => ({
        id: getString(parcel),
        checked: true,
        value: parcel,
        base: isEqual(baseParcel, parcel)
      }))
    }
  }

  handleRadioChange = e => {
    const parcelId = e.target.value
    const options = this.state.options.map(option => {
      if (parcelId === option.id) {
        return { ...option, checked: !option.checked }
      }

      return option
    })
    this.setState({ options })
  }

  handleDeploy = e => {
    e.preventDefault()
    const { options } = this.state
    const parcels = options.filter(option => option.checked).map(option => option.value)
    this.props.onUpdateLand({ base: this.props.base, parcels })
  }

  render() {
    const { wallet, transaction, isLoading, error } = this.props
    const { options } = this.state
    return (
      <div className="LinkScenePage">
        <Navbar />
        {isLoading ? (
          <Loader active size="massive" />
        ) : error ? (
          <Error>{error}</Error>
        ) : (
          <React.Fragment>
            <Header>Update LAND data</Header>

            <p>
              Using {wallet.type === 'node' ? 'MetaMask' : wallet.type} address: &nbsp;
              <Blockie scale={3} seed={wallet.address}>
                <Address tooltip strong value={wallet.address} />
              </Blockie>
            </p>

            <form>
              <div>
                <Button primary onClick={this.handleDeploy}>
                  Deploy
                </Button>
              </div>
              {options.length > 1 ? (
                <div className="options">
                  {options.map(({ id, checked, base }) => (
                    <div key={id}>
                      <input type="checkbox" value={id} checked={checked} disabled={base} onChange={this.handleRadioChange} /> {id}
                    </div>
                  ))}
                </div>
              ) : null}
            </form>

            {transaction ? <Transaction value={transaction} /> : null}
          </React.Fragment>
        )}
        <style>{`
          .LinkScenePage {
            text-align: center;
          }
          .options div input {
            color: white;
          }
        `}</style>
        {isDevelopment() ? (
          <style>{`
            body:before {
              content: 'Development mode on: you are operating on Ropsten';
              background: var(--primary);
              color: white;
              text-align: center;
              text-transform: uppercase;
              height: 24px;
              width: 100%;
              position: fixed;
              padding-top: 2px;
            }
            #root {
              padding-top: 24px;
            }
          `}</style>
        ) : null}
      </div>
    )
  }
}
