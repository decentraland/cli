import * as arg from 'arg'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import * as path from 'path'

import FormData = require('form-data')
import fetch from 'node-fetch'
import opn = require('opn')

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project'
import { LinkerResponse } from 'src/lib/LinkerAPI'
import * as spinner from '../utils/spinner'

const CID = require('cids')
const multihashing = require('multihashing-async')

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -t, --target              Specifies the address and port for the target content server

    ${chalk.dim('Example:')}

    - Deploy your scene:

      ${chalk.green('$ dcl deploy-v3')}

    - Deploy your scene to a specific content server:

    ${chalk.green('$ dcl deploy-v3 --target my-favorite-content-server.org:2323')}
`

export async function main(): Promise<number> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--target': String,
    '-t': '--target'
  })

  const workDir = process.cwd()

  if (await isTypescriptProject(workDir)) {
    spinner.create('Creating deployment structure')

    const dcl = new Decentraland({
      isHttps: args['--https'],
      workingDir: workDir,
      forceDeploy: args['--force-upload'],
      yes: args['--yes']
    })

    // Obtain list of files to deploy
    let originalFilesToIgnore = await dcl.project.getDCLIgnore()
    if (originalFilesToIgnore === null) {
      originalFilesToIgnore = await dcl.project.writeDclIgnore()
    }
    let filesToIgnorePlusEntityJson = originalFilesToIgnore
    if (!filesToIgnorePlusEntityJson.includes('entity.json')) {
      filesToIgnorePlusEntityJson = filesToIgnorePlusEntityJson + '\n' + 'entity.json'
    }
    const files: IFile[] = await dcl.project.getFiles(filesToIgnorePlusEntityJson)
    console.log()
    console.log(`Discovered ${chalk.bold(`${files.length}`)} files.`)

    // Calculate hash for each file
    const contentFiles = await Promise.all(
      files.map(async iFile => {
        return {
          file: iFile.path,
          hash: await calculateBufferHash(iFile.content)
        }
      })
    )
    console.log(`Hashes calculated.`)

    // Create scene.json
    const sceneJson = await getSceneFile(workDir)

    let entity: EntityV3 = {
      type: 'scene',
      pointers: findPointers(sceneJson),
      timestamp: Date.now(),
      content: contentFiles,
      metadata: sceneJson
    }
    let entityJson = JSON.stringify(entity)
    await fs.outputFile(path.join(workDir, 'entity.json'), entityJson)

    let entityJsonAsBuffer = Buffer.from(entityJson)
    const entityJsonFileHash: string = await calculateBufferHash(entityJsonAsBuffer)
    console.log(`Entity json created. Entity id: ${chalk.bold(`${entityJsonFileHash}`)}`)
    spinner.succeed('Deployment structure created.')

    dcl.on('link:ready', url => {
      console.log(chalk.bold('You need to sign the content before the deployment:'))
      spinner.create(`Signing app ready at ${url}`)

      setTimeout(() => {
        try {
          opn(url)
        } catch (e) {
          console.log(`Unable to open browser automatically`)
        }
      }, 5000)

      dcl.on('link:success', ({ address, signature, network }: LinkerResponse) => {
        spinner.succeed(`Content succesfully signed.`)
        console.log(`${chalk.bold('Address:')} ${address}`)
        console.log(`${chalk.bold('Signature:')} ${signature}`)
        console.log(
          `${chalk.bold('Network:')} ${
            network.label ? `${network.label} (${network.name})` : network.name
          }`
        )
      })
    })

    // Signing message
    const messageToSign = entityJsonFileHash
    const { signature, address } = await dcl.getAddressAndSignature(messageToSign)

    // Uploading data
    const contentServerAddress = args['--target'] ? args['--target'] : 'localhost:6969'
    const contentServerUrl = `${contentServerAddress}/entities`
    spinner.create(`Uploading data to: ${contentServerUrl}`)

    const form = new FormData()
    form.append('entityId', entityJsonFileHash)
    form.append('ethAddress', address)
    form.append('signature', signature)
    form.append('entity.json', entityJsonAsBuffer, { filename: 'entity.json' })
    files.forEach((f: IFile) => form.append(f.path, f.content, { filename: f.path }))

    const deployResponse = await fetch(contentServerUrl, {
      method: 'POST',
      body: form as any,
      headers: { 'x-upload-origin': 'CLI' }
    })
    if (deployResponse.ok) {
      spinner.succeed('Content uploaded.')
    } else {
      spinner.fail(`Could not upload content. ${deployResponse.statusText}`)
    }
  }

  return 0
}

async function calculateBufferHash(buffer: Buffer): Promise<ContentFileHash> {
  try {
    const hash = await multihashing(buffer, 'sha2-256')
    return new CID(0, 'dag-pb', hash).toBaseEncodedString()
  } catch (e) {
    console.log('ERROR ', e)
    return Promise.resolve('')
  }
}
export type ContentFileHash = string

interface EntityV3 {
  type: string
  pointers: string[]
  timestamp: number
  content?: ControllerEntityContent[]
  metadata?: any
}

export type ControllerEntityContent = {
  file: string
  hash: string
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}
