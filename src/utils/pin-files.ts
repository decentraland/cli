import axios from 'axios';
import { getIPFSURL } from './get-ipfs-url';

export const pinFiles = async (peerId: string, { x, y }: any) => {
  const ipfsURL: string = await getIPFSURL();

  return axios
    .post(`${ipfsURL}/pin/${peerId}/${x}/${y}`)
    .then(response => response.data)
    .catch(error => {
      if (error.response) {
        return  ({ error: error.response.data.error || error.response.data });
      }
      return { error: 'Connection refused' };
    });
};
