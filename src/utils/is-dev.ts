/**
 * Check if CLI is used in development mode.
 */
export const isDev:boolean =
  process.argv[1].indexOf('index') !== -1 ||
  process.argv[1].indexOf('dev') !== -1;
