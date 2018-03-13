import axios from 'axios';
import { env } from 'decentraland-commons';

import { isDev } from './is-dev';

env.load();

export const getIPFSURL = async () => {
  let ipfsURL: string = null;
  try {
    const { data } = await axios.get('https://decentraland.github.io/ipfs-node/url.json');
    if (isDev) {
      ipfsURL = data.staging;
    } else {
      ipfsURL = data.production;
    }
  } catch (error) {
    // fallback to ENV
  }

  return env.get('IPFS_GATEWAY', () => ipfsURL);
};
