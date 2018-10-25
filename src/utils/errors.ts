export enum ErrorType {
  LINKER_ERROR = 'LinkerError',
  ETHEREUM_ERROR = 'EthereumError',
  IPFS_ERROR = 'IPFSError',
  PROJECT_ERROR = 'ProjectError',
  PREVIEW_ERROR = 'PreviewError',
  UPGRADE_ERROR = 'UpgradeError',
  INFO_ERROR = 'InfoError',
  STATUS_ERROR = 'StatusError',
  DEPLOY_ERROR = 'DeployError',
  API_ERROR = 'APIError',
  UPLOAD_ERROR = 'UploadError'
}

export function fail(type: ErrorType, message: string) {
  const e = new Error(message)
  e.name = type
  throw e
}
