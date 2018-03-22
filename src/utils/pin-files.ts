import axios from 'axios';
import { getIPFSURL } from './get-ipfs-url';

export const pinFiles = async (peerId: string, { x, y }: any) => {
  const ipfsURL: string = await getIPFSURL();

  try {
    await axios.post(`${ipfsURL}/pin/${peerId}/${x}/${y}`);
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || error.response.data);
    }
    throw new Error('Connection refused');
  }
};
