import axios from 'axios';
import { env } from 'decentraland-commons';
env.load();

export const getIPFSURL = async () => {
  let ipfsURL: string = null;
  try {
    const { data } = await axios.get('https://decentraland.github.io/ipfs-node/url.json');
    ipfsURL = data.staging;
  } catch (error) {
    // fallback to ENV
  }

  return env.get('IPFS_GATEWAY', () => ipfsURL);
}
