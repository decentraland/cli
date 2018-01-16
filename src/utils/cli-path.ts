const { getInstalledPathSync } = require('get-installed-path');
/**
 * Get path to where CLI tool is installed.
 *
 * We need this path to copy linker webpage
 * to DCL project directory.
 */
export const cliPath:string = getInstalledPathSync('dcl-cli');
