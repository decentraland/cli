/**
 * Check if CLI is used in development mode.
 */
const isDev =
  process.argv[1].indexOf("index") !== -1 ||
  process.argv[1].indexOf("dev") !== -1;

export default isDev
