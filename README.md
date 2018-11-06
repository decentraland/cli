# Decentraland CLI 1.4

CLI tool for parcel management.

- [x] Quickly create new projects
- [x] Compiling scripts
- [x] Warnings and linting of scenes
- [x] Hot reloading
- [x] Sign and upload scenes to Decentraland Content Server (scene deploying)
- [x] Query parcel/estate/address info
- [x] Query deployment status
- [ ] Optimizing objects, textures
- [ ] Generating bundles of assets
- [ ] Test framework for scripting

## Requirements

- [NodeJS v8 and above](https://nodejs.org)
- [Python 2.7](https://www.python.org/downloads)

## Documentation

Installation details for each platform can be found on the [Documentation](https://docs.decentraland.org/getting-started/installation-guide)

## Usage

### Initialize new Decentraland project **from working directory**:

```bash
dcl init
```

### Start local development server and serve your scene:

```bash
dcl start
```

If you're using a remote server you should use the CI flag (this disable analytics reporting, browser opening and files hot-reloading)

```bash
dcl start --ci
```

### Deploy scene to Content server and the Ethereum Blockchain:


```bash
dcl deploy
```

If you're a ledger user you must use HTTPs flag to support the hardware wallet connection:

```bash
dcl deploy --https
```

### Check parcel/estate/address information:

```bash
dcl info 0,0 # Parcels
dcl info 0x9abdcb8825696cc2ef3a0a955f99850418847f5d # Addresses
dcl info 52 # Estates
```

### Check LAND deployment status:

```bash
dcl status 0,0
```

## Building

1.  Clone the repo: `git clone https://github.com/decentraland/cli.git`
2.  Go into the CLI directory: `cd cli`
3.  Run `npm install`
4.  Build the project by running `npm run build`
4.  Link the CLI with: `npm link`

`dcl` command should now be available.

For CLI tool development, run `npm run watch` in your terminal (you''ll first need to run the build process at least once) and `npm link` in order to use it anywhere. The CLI will use the mainnet address for the LANDProxy contract by default. If you want to change it, you can define the `LAND_REGISTRY_CONTRACT_ADDRESS` environment variable. You can also use `DCL_ENV=dev` to point to the Ropsten contract. Contract addresses are available [here](https://contracts.decentraland.org/addresses.json).
