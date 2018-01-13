//import 'babel-polyfill';
import React from 'react';
import { eth } from 'decentraland-commons';
import LANDRegistry from '../contracts/LANDRegistry';


async function ethereum() {
  const ethInstance = await eth.connect(null, [LANDRegistry])
  console.log(eth)
  const landRegistry = await eth.getContract('LANDRegistry')
  console.log(landRegistry)
  const gasParams = { gas: 1e6, gasPrice: 21e9 }
  await landRegistry.assignMultipleParcels([40, 40, 41, 41], [10, 11, 10, 11], eth.getAddress())
  //await landRegistry.updateManyLandData([1, 2], [0, 0], "QmemJeRDjo8JxmPEVhq7YR36uhe2FzANCRGtNhr5A5h8x5")
  // console.log(await landRegistry.getOwner(41, 10))
  // console.log(await landRegistry.getOwner(41, 11))
  // console.log(await landRegistry.getOwner(40, 10))
  // console.log(await landRegistry.getOwner(40, 11))
  return {
    address: eth.getAddress(),
    landRegistry: await eth.getContract('LANDRegistry')
  }
}

export default class extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {
      loading: true,
      error: false,
      address: null
    }
  }

  componentDidMount() {
    ethereum()
      .then(res => {
        this.setState({
          loading: false,
          address: res.address,
          landRegistry: res.landRegistry
        })
      })
      .catch(err => {
        this.setState({error: err.message})
      });
  }

  updateLandData = async () => {
    await landRegistry.getOwner(0, 0)
  }

  renderUI = () => {

  }

  render() {
    return (
      <div>
        MetaMask address: {this.state.name}

        {this.state.error}
      </div>
    )
  }
}
