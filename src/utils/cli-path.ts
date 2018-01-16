const { getInstalledPathSync } = require('get-installed-path');
/**
 * Get path to where CLI tool is installed.
 *
 * We need this path to copy linker webpage to
 * DCL project directory created after `dcl init`.
 */
export const cliPath: string = getInstalledPathSync('dcl-cli');
