import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { eth, txUtils, contracts } from 'decentraland-eth'

async function ethereum() {
  const { address } = await getContractAddress()
  const land = new contracts.LANDRegistry(address)

  await eth.connect({
    contracts: [land]
  })

  return {
    address: await eth.getAddress(),
    web3: eth.wallet.getWeb3(),
    land
  }
}

async function getContractAddress() {
  const res = await fetch('/api/contract-address')
  return await res.json()
}

async function getSceneMetadata() {
  const res = await fetch('/api/get-scene-data')
  return await res.json()
}

async function getIPFSKey() {
  const res = await fetch('/api/get-ipfs-key')
  const ipfsKey = await res.json()
  return ipfsKey
}

async function closeServer(ok, message) {
  console.log('closing server:', message)
  await fetch(`/api/close?ok=${ok}&reason=${message}`)
}

export default class Page extends React.Component<
  any,
  {
    loading: boolean
    transactionLoading: boolean
    error: boolean | string
    address: string
    tx: string
    sceneMetadata?: any
    ipfsKey?: string
  }
> {
  constructor(a, b) {
    super(a, b)
    this.state = {
      loading: true,
      transactionLoading: false,
      error: false,
      address: null,
      tx: null
    }

    this.onUnload = this.onUnload.bind(this)
  }

  onUnload(event) {
    event.returnValue = 'Please, wait until the transaction is completed'
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onUnload)
  }

  async componentDidMount() {
    window.addEventListener('beforeunload', this.onUnload)
    try {
      let land: contracts.LANDRegistry, address: string

      try {
        const res = await ethereum()
        land = res.land
        address = res.address

        if (!(typeof eth.wallet.getAccount() === 'string')) {
          throw new Error('Please unlock your wallet to continue')
        }

        this.setState({
          loading: false,
          address
        })
      } catch (err) {
        if (err.message === 'Please unlock your wallet to continue') {
          return this.setState({
            error: err.message
          })
        }
        this.setState({
          error: err.message || `Could not connect to Ethereum`
        })
        closeServer(false, 'Could not connect to Ethereum')
      }

      try {
        const sceneMetadata = await getSceneMetadata()
        this.setState({ sceneMetadata })
      } catch (err) {
        this.setState({
          error: `There was a problem getting scene data.\nTry to re-initialize the project with dcl init.`
        })
        closeServer(false, 'There was a problem getting scene data.\nTry to re-initialize the project with dcl init.')
        return
      }

      try {
        const ipfsKey = await getIPFSKey()
        this.setState({ ipfsKey })
      } catch (err) {
        console.error(err)
        this.setState({
          error: `There was a problem getting the IPNS hash of your scene.\nTry to re-upload with dcl upload.`
        })
        closeServer(false, 'There was a problem getting the IPNS hash of your scene.\nTry to re-upload with dcl upload.')
        return
      }

      const coordinates = []

      this.state.sceneMetadata.scene.parcels.forEach(parcel => {
        const [x, y] = parcel.split(',')

        coordinates.push({
          x: parseInt(x, 10),
          y: parseInt(y, 10)
        })
      })
      let oldData
      try {
        console.log('oldData coordinates', coordinates[0].x, coordinates[0].y)
        oldData = await (land as any).landData(coordinates[0].x, coordinates[0].y)
        console.log('oldData data', oldData)
      } catch (e) {
        console.error('oldData error', e)
      }
      let name, description
      try {
        const decoded = contracts.LANDRegistry.decodeLandData(oldData)
        name = decoded.name
        description = decoded.description
      } catch (err) {
        name = ''
        description = ''
      }
      const data = contracts.LANDRegistry.encodeLandData({
        version: 0,
        name,
        description,
        ipns: `ipns:${this.state.ipfsKey}`
      })
      try {
        console.log('update land data', coordinates, data)
        console.log('land', land, land.updateManyLandData)
        const tx = await land.updateManyLandData(coordinates, data)
        console.log('tx', tx)
        this.watchTransactions(tx)
        this.setState({ tx, transactionLoading: true })
      } catch (err) {
        console.log(err)
        this.setState({ loading: false, error: 'Transaction Rejected' })
        closeServer(false, 'Transaction rejected')
      }
    } catch (err) {
      console.log(err)
      this.setState({ loading: false, error: err.message })
      closeServer(false, 'unexpected error')
    }
  }

  async watchTransactions(txId: string) {
    const tx = await txUtils.waitForCompletion(txId)
    if (txUtils.isFailure(tx)) {
      this.setState({ transactionLoading: false, error: 'Transaction failed' })
    } else {
      this.setState({ transactionLoading: false })
      await closeServer(true, 'success')
      window.removeEventListener('beforeunload', this.onUnload)
      window.close()
    }
  }

  renderTxHash = () =>
    this.state.tx ? (
      <p>
        Transaction:<br />
        <a href={`https://etherscan.io/tx/${this.state.tx}`} target="_blank">
          {`https://etherscan.io/tx/${this.state.tx}`}
        </a>
      </p>
    ) : null

  renderError = () => (this.state.error ? <p style={{ color: 'red' }}>{this.state.error}</p> : null)

  renderTransactionStatus = () =>
    !this.state.error && this.state.tx ? (
      !this.state.transactionLoading ? (
        <p style={{ color: 'green' }}>{`Transaction confirmed`}</p>
      ) : (
        <div>
          <p style={{ color: 'orange' }}>{`Transaction pending. This will take a while...`}</p>
          <p style={{ fontSize: 10 }}>{`This window will be closed when the transaction is completed successfully.`}</p>
        </div>
      )
    ) : null

  render() {
    return (
      <div className="dcl-linker-main">
        <div className="dcl-icon" />
        <h3>UPDATE LAND DATA</h3>
        <p>
          MetaMask address:<br />
          {this.state.loading ? 'loading...' : this.state.address}
        </p>
        {this.renderTxHash()}
        {this.renderTransactionStatus()}
        {this.renderError()}
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
