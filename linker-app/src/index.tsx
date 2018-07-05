import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { txUtils } from 'decentraland-eth'

import { Ethereum } from './modules/Ethereum'
import { Server } from './modules/Server'
import { ICoords } from './utils/coordinateHelpers'
import Error from './components/Error'
import Transaction from './components/Transaction'
import TransactionStatus from './components/TransactionStatus'

interface IState {
  loading: boolean
  transactionLoading: boolean
  error: string
  ethereum: Ethereum
  base: ICoords
  parcels: ICoords[]
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
      parcels: null,
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
      // Make update transaction
      const tx = await this.makeTransaction()
      this.watchTransactions(tx)
      this.setState({ tx, transactionLoading: true })
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
    const owner = await Server.getOwner()
    this.setState({ base, parcels, owner })
  }

  async makeTransaction() {
    const { ethereum, base, parcels } = this.state
    return ethereum.updateLand(base, parcels)
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
    const { loading, transactionLoading, error, address, tx } = this.state
    return (
      <div className="dcl-linker-main">
        <div className="dcl-icon" />
        <h3>UPDATE LAND DATA</h3>
        {error ? (
          <Error>{error}</Error>
        ) : (
          <React.Fragment>
            <p>
              MetaMask address:<br />
              {loading ? 'loading...' : address}
            </p>
            {tx ? (
              <React.Fragment>
                <Transaction value={tx} />
                <TransactionStatus loading={transactionLoading} />
              </React.Fragment>
            ) : null}
          </React.Fragment>
        )}
        <style>{`
          .dcl-icon {
            width: 52px;
            height: 52px;
            margin: 30px auto 0;
            background-image: url('https://decentraland.org/images/icons.svg');
          }
          body {
            font-family: 'Arial';
            width: 700px;
            text-align: center;
            margin: 30px auto 0;
          }
          a {
            font-size: 12px;
            color: #00a55b;
          }
        `}</style>
      </div>
    )
  }
}

ReactDOM.render(<Page />, document.getElementById('main'))
