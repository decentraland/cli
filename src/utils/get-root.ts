import { isDev } from './is-dev';

export const getRoot = () => (isDev ? './tmp' : '.');
