import 'babel-polyfill';
import React from 'react';
import Router from 'next/router';
import { eth, txUtils, contracts } from 'decentraland-commons';
const { LANDRegistry } = contracts;

async function ethereum() {
  const { address } = await getContractAddress();
  const land = new LANDRegistry(address);

  await eth.connect({
    contracts: [land]
  });

  return {
    address: await eth.getAddress(),
    web3: eth.web3,
    land
  };
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
  await fetch(`/api/close?ok=${ok}&reason=${message}`);
}

async function pinFiles(peerId, x, y) {
  const res = await fetch(`/api/pin-files/${peerId}/${x}/${y}`);
  const { error } = await res.json();
  return error;
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
    };

    this.onUnload = this.onUnload.bind(this);
  }

  onUnload(event) {
    event.returnValue = 'Please, wait until the transaction and pinning are completed';
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onUnload);
  }

  async componentDidMount() {
    window.addEventListener('beforeunload', this.onUnload);
    try {
      let land, address, web3;

      try {
        const res = await ethereum();
        land = res.land;
        address = res.address;
        web3 = res.web3;
        this.setState({
          loading: false,
          address
        });
      } catch (err) {
        console.log(err.message);
        this.setState({
          error: `Could not connect to MetaMask`
        });
        return;
      }

      try {
        const sceneMetadata = await getSceneMetadata();
        this.setState({ sceneMetadata });
      } catch (err) {
        this.setState({
          error: `There was a problem getting scene data.\nTry to re-initialize the project with dcl init.`
        });
        closeServer(false, 'There was a problem getting scene data.\nTry to re-initialize the project with dcl init.');
        return;
      }

      try {
        const ipfsKey = await getIPFSKey();
        const peerId = await getPeerId();
        this.setState({ ipfsKey, peerId });
      } catch (err) {
        this.setState({
          error: `There was a problem getting IPNS hash of your scene.\nTry to re-upload with dcl upload.`
        });
        closeServer(false, 'There was a problem getting IPNS hash of your scene.\nTry to re-upload with dcl upload.');
        return;
      }

      const coordinates = [];

      this.state.sceneMetadata.scene.parcels.forEach(parcel => {
        const [x, y] = parcel.split(',');

        coordinates.push({
          x: parseInt(x, 10),
          y: parseInt(y, 10)
        });
      });
      let oldData;
      try {
        console.log('oldData coordinates', coordinates[0].x, coordinates[0].y);
        oldData = await land.landData(coordinates[0].x, coordinates[0].y);
        console.log('oldData data', oldData);
      } catch (e) {
        console.error('oldData error', e);
      }
      let name, description;
      try {
        const decoded = LANDRegistry.decodeLandData(oldData);
        name = decoded.name;
        description = decoded.description;
      } catch (err) {
        name = '';
        description = '';
      }
      const data = LANDRegistry.encodeLandData({
        version: 0,
        name,
        description,
        ipns: `ipns:${this.state.ipfsKey}`
      });
      try {
        console.log('update land data', coordinates, data);
        const tx = await land.updateManyLandData(coordinates, data);
        const [x, y] = this.state.sceneMetadata.scene.base.split(',');
        this.watchTransactions(tx, x, y);
        this.setState({ tx, transactionLoading: true });
      } catch (err) {
        this.setState({ loading: false, error: 'Transaction Rejected' });
        closeServer(false, 'Transaction rejected');
      }
    } catch (err) {
      this.setState({ loading: false, error: err.message });
      closeServer(false, 'unexpected error');
    }
  }

  async watchTransactions(txId, x, y) {
    const { peerId } = this.state;
    const tx = await txUtils.waitForCompletion(txId);
    if (!txUtils.isFailure(tx)) {
      this.setState({ transactionLoading: false, pinningLoading: true });
      const error = await pinFiles(peerId, x, y);
      this.setState({
        pinningLoading: false,
        error: error && `Pinning files to IPFS failed. ${error}`
      });
      window.removeEventListener('beforeunload', this.onUnload);
      if (error) {
        closeServer(false, `Pinning files to IPFS failed. ${error}`);
      } else {
        closeServer(true);
      }
    } else {
      this.setState({ transactionLoading: false, error: 'Transaction failed' });
      closeServer(false, 'Transaction failed');
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
    ) : null;

  renderError = () => (this.state.error ? <p style={{ color: 'red' }}>{this.state.error}</p> : null);

  renderTransactionStatus = () =>
    !this.state.error && this.state.tx ? (
      !this.state.transactionLoading ? (
        <p style={{ color: 'green' }}>{`Transaction confirmed.`}</p>
      ) : (
        <p style={{ color: 'orange' }}>{`Transaction pending. Will take a while...`}</p>
      )
    ) : null;

  renderPinningIPFSStatus = () =>
    !this.state.error && this.state.tx && !this.state.transactionLoading ? (
      !this.state.pinningLoading ? (
        <p style={{ color: 'green' }}>{`Pinning files to IPFS succeeded.`}</p>
      ) : (
        <p style={{ color: 'orange' }}>{`Pinning files to IPFS pending. Will take a while...`}</p>
      )
    ) : null;

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
        {this.renderPinningIPFSStatus()}
        {this.renderError()}
        <style jsx>{`
          .dcl-icon {
            width: 52px;
            height: 52px;
            margin: 30px auto 0;
            background-image: url('https://decentraland.org/images/icons.svg');
          }
        `}</style>
        <style global jsx>{`
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
    );
  }
}
