export enum ErrorType {
  LINKER_ERROR = 'LinkerError',
  ETHEREUM_ERROR = 'EthereumError',
  IPFS_ERROR = 'IPFSError',
  PROJECT_ERROR = 'ProjectError',
  PREVIEW_ERROR = 'PreviewError',
  UPGRADE_ERROR = 'UpgradeError',
  DEPLOY_ERROR = 'DeployError'
}

export function fail(type: ErrorType, message: string) {
  const e = new Error(message)
  e.name = type
  throw e
}
