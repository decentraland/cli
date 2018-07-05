import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { txUtils } from 'decentraland-eth'
import { Address, Blockie, Header, Navbar, Menu, Button, Radio, Loader } from 'decentraland-ui'

import { Ethereum } from './modules/Ethereum'
import { Server } from './modules/Server'
import { ICoords, getString, isEqual } from './utils/coordinateHelpers'
import Error from './components/Error'
import Transaction from './components/Transaction'
import TransactionStatus from './components/TransactionStatus'

interface IOptions {
  id: string
  value: ICoords
  checked: boolean
  base: boolean
}

interface IState {
  loading: boolean
  transactionLoading: boolean
  error: string
  ethereum: Ethereum
  base: ICoords
  options: IOptions[]
  owner: string
  address: string
  ipfsKey?: string
  tx: string
}

export default class Page extends React.Component<any, IState> {
  constructor(props) {
    super(props)
    this.onUnload = this.onUnload.bind(this)
    this.state = {
      loading: true,
      transactionLoading: false,
      error: null,
      ethereum: null,
      base: null,
      options: null,
      owner: null,
      address: null,
      tx: null
    }
  }

  async componentDidMount() {
    window.addEventListener('beforeunload', this.onUnload)
    try {
      await this.loadSceneData()
      await this.loadEtherum()
    } catch ({ message }) {
      this.setState({ loading: false, error: message })
      Server.closeServer(false, message)
    }
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onUnload)
  }

  onUnload(event) {
    event.returnValue = 'Please, wait until the transaction is completed'
  }

  async loadEtherum(): Promise<void> {
    const ethereum = new Ethereum()
    await ethereum.init(this.state.owner)
    this.setState({ loading: false, ethereum, address: ethereum.getAddress() })
  }

  async loadSceneData(): Promise<void> {
    const base = await Server.getBaseParcel()
    const parcels = await Server.getParcels()
    const options = parcels.map(parcel => ({ id: getString(parcel), checked: true, value: parcel, base: isEqual(base, parcel) }))
    const owner = await Server.getOwner()
    this.setState({ base, options, owner })
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

  handleDeploy = async e => {
    e.preventDefault()
    try {
      const { ethereum, base, options } = this.state
      const parcels = options.filter(option => option.checked).map(option => option.value)
      const tx = await ethereum.updateLand(base, parcels)
      this.watchTransactions(tx)
      this.setState({ tx, transactionLoading: true })
    } catch (err) {
      this.setState({ loading: false, error: err.message || 'Unexpected error' })
      Server.closeServer(false, err)
    }
  }

  async watchTransactions(txId: string) {
    const tx = await txUtils.waitForCompletion(txId)
    if (txUtils.isFailure(tx)) {
      this.setState({ transactionLoading: false, error: 'Transaction failed' })
    } else {
      this.setState({ transactionLoading: false })
      await Server.closeServer(true, 'success')
      window.removeEventListener('beforeunload', this.onUnload)
    }
  }

  render() {
    const { loading, transactionLoading, error, address, tx, options } = this.state
    return (
      <React.Fragment>
        <Navbar isConnected={!loading} isConnecting={loading} connectingMenuItem={<Menu.Item>Connecting...</Menu.Item>} address={address} />
        {loading ? (
          <Loader active size="massive" />
        ) : error ? (
          <Error>{error}</Error>
        ) : (
          <React.Fragment>
            <Header>Update LAND data</Header>
            <p>
              MetaMask address: &nbsp;
              <Blockie scale={3} seed={address}>
                <Address tooltip strong value={address} />
              </Blockie>
            </p>

            <form>
              <div>
                <Button primary onClick={this.handleDeploy}>
                  Deploy
                </Button>
                <Button>Cancel</Button>
              </div>
              <div className="options">
                {options.map(({ id, checked, base }) => (
                  <div key={id}>
                    <input type="checkbox" value={id} checked={checked} disabled={base} onChange={this.handleRadioChange} /> {id}
                  </div>
                ))}
              </div>
            </form>

            {tx ? (
              <React.Fragment>
                <Transaction value={tx} />
                <TransactionStatus loading={transactionLoading} />
              </React.Fragment>
            ) : null}
          </React.Fragment>
        )}
        <style>{`
          body {
            text-align: center;
          }
          .options div {
            4px
          }
        `}</style>
      </React.Fragment>
    )
  }
}

ReactDOM.render(<Page />, document.getElementById('main'))
