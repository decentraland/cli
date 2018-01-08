# Decentraland CLI

CLI tool for parcel management.

* [x] Quickly create new projects
* [ ] Uploading scenes to IPFS
* [ ] Hot reloading
* [ ] Linking Ethereum to the scene
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
$ npm install -g dcl-cli
```

## Usage

- Initialize new Decentraland project:

```bash
$ dcl init
```

- Start local development server and serve your a-minus scene:

```bash
$ dcl start
```

- Upload scene to IPFS:

```bash
$ dcl upload
```

- Link Ethereum to the current scene:

```bash
$ dcl link
```

## Building

1. Clone the dcl-cli: `git clone https://github.com/decentraland/cli.git`
2. Go into the cli directory: `cd cli`
3. Run `npm install`
4. Link the cli with: `npm link`

`dcl` command should now be available.

For CLI tool development, run `npm start` in your terminal.
