import "babel-polyfill";
import React from 'react';
import Router from 'next/router';
import { eth } from 'decentraland-commons';
import { LANDRegistry } from 'decentraland-commons/dist/contracts/LANDRegistry';

async function ethereum() {
  const { address } = await getContractAddress()
  const land = new LANDRegistry(address)

  await eth.connect({ contracts: [land]})

  return {
    address: await eth.getAddress(),
    land,
    web3: eth.web3
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

async function getIpnsHash() {
  const res = await fetch('/api/get-ipns-hash');
  const ipnsHash = await res.json();
  return ipnsHash;
}

async function closeServer(ok, message) {
  console.log('closing server:', message)
  await fetch(`/api/close?ok=${ok}&reason=${message}`);
}

export default class Page extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {
      loading: true,
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
        const ipnsHash = await getIpnsHash();
        this.setState({ ipnsHash });
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
        ipns: `ipns:${this.state.ipnsHash}`
      })
      try {
        console.log('update land data', coordinates, data)
        const tx = await land.updateManyLandData(coordinates, data)
        this.setState({ tx })
        closeServer(true, 'transaction successful')
      } catch(err) {
        this.setState({loading: false, error: 'Transaction Rejected'})
        closeServer(false, 'transaction rejected')
      }
    } catch(err) {
      this.setState({loading: false, error: err.message})
      closeServer(false, 'unexpected error')
    }
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

  render() {
    return (
      <div className="dcl-linker-main">
        <div className="dcl-icon"></div>
        <h3>UPDATE LAND DATA</h3>
        <p>MetaMask address:<br />
          {this.state.loading ? "loading..." : this.state.address}
        </p>
        {this.renderTxHash()}
        {this.renderError()}
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
