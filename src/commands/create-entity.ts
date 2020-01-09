import * as arg from 'arg'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import * as path from 'path'

import FormData = require('form-data')
import * as fetch from 'isomorphic-fetch'
import opn = require('opn')


import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project';
import { LinkerResponse } from 'src/lib/LinkerAPI'

const CID = require('cids')
const multihashing = require('multihashing-async')


export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change

    ${chalk.dim('Example:')}

    - Build your scene:

      ${chalk.green('$ dcl build')}
`

export async function main(): Promise<number> {
    const args = arg({
        '--help': Boolean,
        '-h': '--help',
        '--watch': String,
        '-w': '--watch'
    })

    const workDir = process.cwd()

    if (await isTypescriptProject(workDir)) {
        console.log("Inside create-entity.js")
        console.log(args)

        const dcl = new Decentraland({
            isHttps: args['--https'],
            workingDir: workDir,
            forceDeploy: args['--force-upload'],
            yes: args['--yes']
        })

        let originalFilesToIgnore = await dcl.project.getDCLIgnore()
        if (originalFilesToIgnore === null) {
            originalFilesToIgnore = await dcl.project.writeDclIgnore()
        }
        let filesToIgnorePlusEntityJson = originalFilesToIgnore
        if (!filesToIgnorePlusEntityJson.includes('entity.json')) {
            filesToIgnorePlusEntityJson = filesToIgnorePlusEntityJson + '\n' +  'entity.json'
        }
        const files: IFile[] = await dcl.project.getFiles(filesToIgnorePlusEntityJson)
        console.log(files)


        const someHash = await calculateBufferHash(files[0].content)
        console.log("SOME-HASH ", someHash)

        const contentFiles = await Promise.all(files.map(async iFile => { return {
            file: iFile.path,
            hash: await calculateBufferHash(iFile.content)
        }}))
        console.log("1111")
        // const contentFiles: ControllerEntityContent[] = filesWithHashes.map(file => { return { file: file.name, hash: file.cid } })

        const sceneJson = await getSceneFile(workDir)

        let entity: EntityV3 = {
            type: "scene",
            pointers: findPointers(sceneJson),
            timestamp: Date.now(),
            content: contentFiles,
            metadata: sceneJson,
        }
        let entityJson = JSON.stringify(entity)
        await fs.outputFile(path.join(workDir, 'entity.json'), entityJson)
        console.log("Created entity.json")

        let entityJsonAsBuffer = Buffer.from(entityJson)
        console.log("Entity json buffer: ", entityJsonAsBuffer.toString('base64'))
        const entityJsonFileHash: string = await calculateBufferHash(entityJsonAsBuffer)

        dcl.on('link:ready', url => {
            console.log(chalk.bold('You need to sign the content before the deployment:'))

            setTimeout(() => {
                try {
                    opn(url)
                } catch (e) {
                    console.log(`Unable to open browser automatically`)
                }
            }, 5000)

            dcl.on('link:success', ({ address, signature, network }: LinkerResponse) => {
                console.log(`${chalk.bold('Address:')} ${address}`)
                console.log(`${chalk.bold('Signature:')} ${signature}`)
                console.log(
                    `${chalk.bold('Network:')} ${
                    network.label ? `${network.label} (${network.name})` : network.name
                    }`
                )
            })
        })

        const messageToSign = entityJsonFileHash
        const { signature, address } = await dcl.getAddressAndSignature(messageToSign)
        console.log("signature ", signature)
        console.log("address ", address)

        const form = new FormData();
        form.append('entityId'  , entityJsonFileHash)
        form.append('ethAddress', address)
        form.append('signature' , signature)

        form.append('entity.json', entityJsonAsBuffer, { filename: 'entity.json' })
        files.forEach((f: IFile) => form.append(f.path, f.content, { filename: f.path }))

        console.log("Before executing call...")
        const deployResponse = await fetch(`http://localhost:6969/entities`, { method: 'POST', body: <any> form })
        console.log(deployResponse)

    }

    return 0
}

async function calculateBufferHash(buffer: Buffer): Promise<ContentFileHash> {
    // return new CID(buffer).toBaseEncodedString()

    try {
        console.log("2222")
        const hash = await multihashing(buffer, "sha2-256")
        console.log("XXXX: ", hash)
        return new CID(0, 'dag-pb', hash).toBaseEncodedString()
    } catch(e) {
        console.log("ERROR ", e)
        return Promise.resolve("")
    }

    // return Promise.resolve("")
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
    file: string,
    hash: string,
}

function findPointers(sceneJson: any): string[] {
    return sceneJson.scene.parcels
}
