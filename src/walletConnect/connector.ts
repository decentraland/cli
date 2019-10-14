import { WalletConnect } from '.'

let connector: WalletConnect

export function isWC() {
  return !!connector
}

export function setWalletConnector(_connector: WalletConnect): void {
  connector = _connector
}

export function getWalletConnector(): WalletConnect {
  return connector
}
