import "babel-polyfill";
import React from 'react';
import { eth as web3Eth } from 'decentraland-commons';

async function ethereum() {
  const connect = await web3Eth.connect()
  console.log(connect)
}

export default class extends React.Component {
  // static async getInitialProps({ req }) {
  //   const userAgent = req ? req.headers['user-agent'] : navigator.userAgent
  //   return { userAgent }
  // }
  componentDidMount() {
    if (window) {
      console.log(window)
      console.log(web3Eth)
      ethereum()
    }
  }

  render() {
    return (
      <div>
        Hello World
      </div>
    )
  }
}
