import "babel-polyfill";
import React from 'react';
import Router from 'next/router';
import { eth } from 'decentraland-commons';
import LANDRegistry from '../contracts/LANDRegistry';

async function ethereum() {
  await eth.connect(null, [LANDRegistry])
  const land = await eth.getContract('LANDRegistry')

  return {
    address: await eth.getAddress(),
    land,
    web3: eth.web3
  }
}

async function getSceneMetadata() {
  const res = await fetch('http://localhost:4044/api/get-scene-data');
  return await res.json();
}

async function getIpnsHash() {
  const res = await fetch('http://localhost:4044/api/get-ipns-hash');
  const ipnsHash = await res.json();
  console.log(ipnsHash);
  return ipnsHash;
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
    const sceneMetadata = await getSceneMetadata();
    const ipnsHashTest = await getIpnsHash();
    const ipnsHash = 'QmemJeRDjo8JxmPEVhq7YR36uhe2FzANCRGtNhr5A5h8x5'
    try {
      const { land, address, web3 } = await ethereum()

      this.setState({
        loading: false,
        address
      })

      //console.log(await land.ownerOfLandMany([5, 5, 5], [0, -1, -2]))

      const tx = await land.updateManyLandData(
        [5, 5, 5],
        [0, -1, -2],
        ipnsHash
      )
      console.log(tx)
      this.setState({ tx })
    } catch(err) {
      this.setState({loading: false, error: err.message})
    }
  }

  renderTxHash = () => (
    this.state.tx ? (
      <p>Transaction:<br />
        <a href={`https://ropsten.etherscan.io/tx/${this.state.tx}`} target="_blank">
          {`https://ropsten.etherscan.io/tx/${this.state.tx}`}
        </a>
      </p>
     ) : null
  )

  renderError = () => (
    this.state.error ? <p>{this.state.error}</p> : null
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
