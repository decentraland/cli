# Decentraland CLI

CLI tool for parcel management.

* [x] Quickly create new projects
* [x] Uploading scenes to IPFS
* [x] Hot reloading
* [x] Linking Ethereum to the scene
* [x] Pinning scene to Decentraland IPFS node
* [ ] Editor modifying local files and “uploading” to the directory
* [ ] Optimizing objects, textures
* [ ] Warnings and linting of scenes
* [ ] Compiling scripts
* [ ] Generating bundles of assets
* [ ] Manage IPFS uploading/differential uploads
* [ ] Test framework for scripting
* [ ] Snapshots of the scene

## Requirements

- [NodeJS v8 and above](https://github.com/decentraland/cli#nodejs-installation)
- [Python 2.7](https://www.python.org/downloads/)
- [IPFS](https://dist.ipfs.io/#go-ipfs)

## NodeJS Installation

### MacOS/Linux:

You need to have NodeJS (version 8.*.* and above) installed on your system to use the CLI. You can use official NodeJS installer, but on MacOS/Linux we recommend to use [NVM](https://github.com/creationix/nvm) for managing your NodeJS installation. Please follow the installation instructions.

### Windows:

We recommend using official NodeJS installer - download the latest LTS version [here](https://nodejs.org/en/download/) (we only support version 8.*.* and above).

### CLI installation

If you have NodeJS installed, run this command from terminal:

```bash
$ npm install -g decentraland
```

This should install CLI tool and make it available globally. Please proceed to [usage](https://github.com/decentraland/cli#usage) documentation.

## Documentation

* [Decentraland CLI Docs](http://docs.decentraland.org/docs/command-line-interface)

## Usage

- Initialize new Decentraland project **from working directory**:

```bash
$ dcl init
```

- Start local development server and serve your a-minus scene:

```bash
$ dcl start
```

- Upload scene to IPFS:

First, you need to have IPFS installed locally. Download it [here](https://ipfs.io/docs/install/).
Note: You need to have IPFS daemon running for this to work!

```bash
$ dcl upload
```

- Link Ethereum to the current scene and pin scene to Decentraland IPFS node:

```bash
$ dcl link
```

- Upload scene to IPFS, update IPNS and link Ethereum to the current scene in one go:

```bash
$ dcl push
```

## Updating

If you encounter a message `Ethereum linker app is outdated! Please run dcl upgrade!`, you need to update the Ethereum linker inside your Decentraland project:

1. `cd your-dcl-project`
2. `dcl upgrade`

To update the CLI tool:

```bash
$ npm update -g decentraland
```

## Building

1. Clone the repo: `git clone https://github.com/decentraland/cli.git`
2. Go into the CLI directory: `cd cli`
3. Run `npm install`
4. Link the CLI with: `npm link`

`dcl` command should now be available.

For CLI tool development, run `npm start` in your terminal. The CLI will use the mainnet address for the LANDProxy contract by default. If you want to change it, you can add a `.env` file on the root folder, with a `LAND_REGISTRY_CONTRACT_ADDRESS` var. It'll use [dotenv](https://github.com/motdotla/dotenv#faq) to fetch the value. You can check the current contract addresses [here](https://contracts.decentraland.org/addresses.json).

For the Decentraland IPFS node, we are getting the url from [here](decentraland.github.io/ipfs-node/url.json). If you want to set a different url set the `IPFS_GATEWAY` var in the `.env` file.

You can run CLI commands in development mode like this: `npm start -- init`

You can do incremental compilations by running `npm run watch`, but you will need to run `npm run build` at least once before to build the `linker-app`, and if you make changes to the linker you will need to re-run `npm run build`.
