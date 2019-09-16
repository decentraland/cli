# Decentraland CLI ![Decentraland Logo](css/logo.svg)

[![Build Status](https://circleci.com/gh/decentraland/cli.svg?&style=shield)](https://circleci.com/gh/decentraland/workflows/cli)
[![chat on Discord](https://img.shields.io/discord/417796904760639509.svg?logo=discord)](https://discordapp.com/invite/9EcuFgC)

## Usage

To install the latest version of `dcl` (Decentraland CLI), run this command:

```bash
npm install -g decentraland
```

See more details at [Decentraland docs](https://docs.decentraland.org/getting-started/installation-guide).

## Documentation

For details on how to use Decentraland developer tools, check our [documentation site](https://docs.decentraland.org)

## Contributing

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.
2.  Install dependencies with `npm install`.
3.  Build the project by running `npm run build`.
4.  Link the CLI with: `npm link`. The `dcl` command should now be available.
5.  You can run tests with `npm test`

**NOTE:** you can set the environment variable `DEBUG=true` to see all debugging info

## Releasing
We're using [ZEIT release](https://github.com/zeit/release) tool:
```bash
npm i -g release
```

## Configuration

`dcl` can be configured in several ways to adapt it to another environment other than the default one. To do this you have to either set environment variables or change your `~/.dclinfo` file:

| Variable name            | Enviroment variable |  `~/.dclinfo`  |
| ------------------------ | :-----------------: | :------------: |
| Provider                 |       RPC_URL       |       -        |
| MANA Token Contract      |     MANA_TOKEN      |   MANAToken    |
| LAND Registry Contract   |    LAND_REGISTRY    |  LANDRegistry  |
| Estate Registry Contract |   ESTATE_REGISTRY   | EstateRegistry |
| Content Server URL       |     CONTENT_URL     |   contentUrl   |
| Segment API key          |     SEGMENT_KEY     |   segmentKey   |

## Copyright info
This repository is protected with a standard Apache 2 license. See the terms and conditions in the [LICENSE](https://github.com/decentraland/cli/blob/master/LICENSE) file.
