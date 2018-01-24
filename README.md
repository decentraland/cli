# Decentraland CLI

CLI tool for parcel management.

* [x] Quickly create new projects
* [x] Uploading scenes to IPFS
* [x] Hot reloading
* [x] Linking Ethereum to the scene
* [ ] Editor modifying local files and “uploading” to the directory
* [ ] Optimizing objects, textures
* [ ] Warnings and linting of scenes
* [ ] Compiling scripts
* [ ] Generating bundles of assets
* [ ] Manage IPFS uploading/differential uploads
* [ ] Test framework for scripting
* [ ] Snapshots of the scene

## Installation

```bash
$ npm install -g decentraland
```

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

- Link Ethereum to the current scene:

```bash
$ dcl link
```

- Upload scene to IPFS, update IPNS and link Ethereum to the current scene in one go:

```bash
$ dcl push
```

## Building

1. Clone the repo: `git clone https://github.com/decentraland/cli.git`
2. Go into the cli directory: `cd cli`
3. Run `npm install`
4. Link the cli with: `npm link`

`dcl` command should now be available.

For CLI tool development, run `npm start` in your terminal. The cli will use the mainnet address for the LANDProxy contract by default. If you want to change it, you can add a `.env` file on the root folder, with a `LAND_REGISTRY_CONTRACT_ADDRESS` var. It'll use [dotenv](https://github.com/motdotla/dotenv#faq) to fetch the value. You can check the current contract addresses [here](https://contracts.decentraland.org/addresses.json).

You can run CLI commands in development mode like this: `npm start -- init`

You can do incremental compilations by running `npm run watch`, but you will need to run `npm run build` at least once before to build the `linker-app`, and if you make changes to the linker you will need to re-run `npm run build`.
