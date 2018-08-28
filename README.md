# Decentraland CLI 1.3

CLI tool for parcel management.

- [x] Quickly create new projects
- [x] Uploading scenes to IPFS
- [x] Linking Ethereum to the scene
- [x] Pinning scene to Decentraland IPFS node
- [x] Compiling scripts
- [x] Warnings and linting of scenes
- [x] Hot reloading
- [x] Query parcel info
- [x] Query deployment status
- [ ] Optimizing objects, textures
- [ ] Generating bundles of assets
- [ ] Test framework for scripting

## Requirements

- [NodeJS v8 and above](https://nodejs.org)
- [Python 2.7](https://www.python.org/downloads)
- [IPFS](https://dist.ipfs.io/#go-ipfs)

## Documentation

Installation details for each platform can be found on the [Documentation](https://docs.decentraland.org/documentation/installation-guide/)

## Usage

### Initialize new Decentraland project **from working directory**:

```bash
dcl init
```

### Start local development server and serve your scene:

```bash
dcl start
```

You can prevent the browser from opening by using the `--no-browser` flag.

### Deploy scene to IPFS and the Ethereum Blockchain:

You need to have IPFS daemon running for this to work!

```bash
dcl deploy
```

If you're a ledger user you must use HTTPs flag to support the hardware wallet connection:

```bash
dcl deploy --https
```

### Check installed CLI version:

```bash
dcl -v
```

### Check parcel information:

```bash
dcl info 0,0
```

### Check owner information:

```bash
dcl info 0x...
```

### Check parcel deployment status:

```bash
dcl status 0,0
```

When deployments are unsuccessful you can save some time by calling `dcl link` or `dcl pin` atomically.

## Building

1.  Clone the repo: `git clone https://github.com/decentraland/cli.git`
2.  Go into the CLI directory: `cd cli`
3.  Run `npm install`
4.  Link the CLI with: `npm link`

`dcl` command should now be available.

For CLI tool development, run `npm run watch` in your terminal and `npm link` in order to use it anywhere. The CLI will use the mainnet address for the LANDProxy contract by default. If you want to change it, you can define the `LAND_REGISTRY_CONTRACT_ADDRESS` environment variable. You can also use `DCL_ENV=dev` to point to the Ropsten contract. Contract addresses are available [here](https://contracts.decentraland.org/addresses.json).

For the Decentraland IPFS node, we are getting the url from [here](decentraland.github.io/ipfs-node/url.json). If you want to set a different url set the `IPFS_GATEWAY` var in the `.env` file.

You can do incremental compilations by running `npm run watch`, but you will need to run `npm run build` at least once before.
