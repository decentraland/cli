import "babel-polyfill";
import React from 'react';
import Router from 'next/router';
import { eth, txUtils } from 'decentraland-commons';
import { LANDRegistry } from 'decentraland-commons/dist/contracts/LANDRegistry';

async function ethereum() {
  // const { address } = await getContractAddress()
  const address = '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75b'
  const land = new LANDRegistry(address)

  const connected = await eth.connect({
    contracts: [LANDRegistry]
  })

  return {
    address: await eth.getAddress(),
    land: eth.getContract('LANDRegistry'),
    web3: eth.web3,
  }
}

async function getContractAddress() {
  const res = await fetch('/api/contract-address');
  return await res.json();
}

async function getSceneMetadata() {
  const res = await fetch('/api/get-scene-data');
  return await res.json();
}

async function getIPFSKey() {
  const res = await fetch('/api/get-ipfs-key');
  const ipfsKey = await res.json();
  return ipfsKey;
}

async function getPeerId() {
  const res = await fetch('/api/get-ipfs-peerid');
  const peerId = await res.json();
  return peerId;
}

async function closeServer(ok, message) {
  console.log('closing server:', message)
  await fetch(`/api/close?ok=${ok}&reason=${message}`);
}

async function pinFiles (peerId, x, y) {
  const res = await fetch(`http://ipfs.decentraland.zone:3000/api/pin/${peerId}/${x}/${y}`);
  const { ok } = await res.json()
  return ok
}

export default class Page extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {
      loading: true,
      transactionLoading: false,
      pinningLoading: false,
      error: false,
      address: null,
      tx: null
    }
  }

  async componentDidMount() {
    try {
      let land, address, web3

      try {
        const res = await ethereum()
        land = res.land
        address = res.address
        web3 = res.web3
        this.setState({
          loading: false,
          address
        })
      } catch(err) {
        console.log(err.message)
        this.setState({
          error: `Could not connect to MetaMask`
        });
        return;
      }

      try {
        const sceneMetadata = await getSceneMetadata();
        this.setState({ sceneMetadata });
      } catch(err) {
        this.setState({
          error: `There was a problem getting scene data.\nTry to re-initialize the project with dcl init.`
        });
        closeServer(false, 'scene metadata error')
        return;
      }

      try {
        const ipfsKey = await getIPFSKey();
        const peerId = await getPeerId();
        this.setState({ ipfsKey, peerId });
      } catch(err) {
        this.setState({
          error: `There was a problem getting IPNS hash of your scene.\nTry to re-upload with dcl upload.`
        });
        closeServer(false, 'ipns error')
        return;
      }

      const coordinates = [];

      this.state.sceneMetadata.scene.parcels.forEach(parcel => {
        const [x, y] = parcel.split(",");

        coordinates.push({
          x: parseInt(x, 10),
          y: parseInt(y, 10)
        })
      });
      let oldData
      try {
        console.log('oldData coordinates', coordinates[0].x, coordinates[0].y)
        oldData = await land.getData(coordinates[0].x, coordinates[0].y)
        console.log('oldData data', oldData)
      } catch(e) {
        console.error('oldData error', e)
      }
      let name, description
      try {
        const decoded = LANDRegistry.decodeLandData(oldData)
        name = decoded.name
        description = decoded.description
      } catch(err) {
        name = ''
        description = ''
      }
      const data = LANDRegistry.encodeLandData({
        version: 0,
        name,
        description,
        ipns: `ipns:${this.state.ipfsKey}`
      })
      try {
        console.log('update land data', coordinates, data)
        const tx = await land.updateManyLandData(coordinates, data)
        this.watchTransactions(tx, coordinates[0].x, coordinates[0].y)
        this.setState({ tx, transactionLoading: true })
        // closeServer(true, 'transaction successful')
      } catch(err) {
        this.setState({loading: false, error: 'Transaction Rejected'})
        console.log(err.message)
        closeServer(false, 'transaction rejected')
      }
    } catch(err) {
      this.setState({loading: false, error: err.message})
      closeServer(false, 'unexpected error')
    }
  }

  async watchTransactions (tx, x, y) {
    const { peerId } = this.state
    await txUtils.waitForCompletion(tx)
    this.setState({ transactionLoading: false, pinningLoading: true })
    const success = await pinFiles(peerId, x, y)
    this.setState({
      pinningLoading: false,
      error: !success ? 'Failed pinning files to ipfs' : null
    })
  }

  renderTxHash = () => (
    this.state.tx ? (
      <p>Transaction:<br />
        <a href={`https://etherscan.io/tx/${this.state.tx}`} target="_blank">
          {`https://etherscan.io/tx/${this.state.tx}`}
        </a>
      </p>
     ) : null
  )

  renderError = () => (
    this.state.error ? <p style={{ color: 'red' }}>{this.state.error}</p> : null
  )

  renderTransactionStatus = () => (
    this.state.tx ?
      !this.state.transactionLoading ?
        <p style={{ color: 'green' }}>{`Transaction confirmed.`}</p>
        :  <p style={{ color: 'orange' }}>{`Transaction pending. Will take a while...`}</p>
      : null
  )

  renderPinningIPFSStatus = () => (
    !this.state.error && this.state.tx && !this.state.transactionLoading ?
      !this.state.pinningLoading ?
        <p style={{ color: 'green' }}>{`Pinning Success.`}</p>
        :  <p style={{ color: 'orange' }}>{`Pinning pending. Will take a while...`}</p>
      : null
  )

  render() {
    return (
      <div className="dcl-linker-main">
        <div className="dcl-icon"></div>
        <h3>UPDATE LAND DATA</h3>
        <p>MetaMask address:<br />
          {this.state.loading ? "loading..." : this.state.address}
        </p>
        { this.renderTxHash() }
        { this.renderTransactionStatus() }
        { this.renderPinningIPFSStatus() }
        { this.renderError() }
        <style jsx>{`
          .dcl-icon {
            width: 52px;
            height: 52px;
            margin: 30px auto 0;
            background-image: url("https://decentraland.org/images/icons.svg");
          }
        `}</style>
        <style global jsx>{`
          body {
            font-family: "Arial";
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
