import * as arg from 'arg'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import * as path from 'path'

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { CIDUtils } from '../lib/content/CIDUtils';
import { IFile } from '../lib/Project';
import { ContentIdentifier } from '../lib/content/ContentUploadRequest';

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

        let filesToIgnore = await dcl.project.getDCLIgnore()
        if (filesToIgnore === null) {
            filesToIgnore = await dcl.project.writeDclIgnore()
        }
        if (!filesToIgnore.includes('entity.json')) {
            filesToIgnore = filesToIgnore + '\n' +  'entity.json'
        }
        const files: IFile[] = await dcl.project.getFiles(filesToIgnore)
        const filesWithHashes: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile(files)
        const contentFiles: ControllerEntityContent[] = filesWithHashes.map(file => { return { file: file.name, hash: file.cid } })

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

    }

    return 0
}


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
