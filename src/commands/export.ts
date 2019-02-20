import * as path from 'path'
import * as fs from 'fs-extra'
import * as arg from 'arg'
import chalk from 'chalk'

import * as spinner from '../utils/spinner'
import { fail, ErrorType } from '../utils/errors'
import getProjectFilePaths from '../utils/getProjectFilePaths'
import getDummyMappings from '../utils/getDummyMappings'

export const help = () => `
  Usage: ${chalk.bold('dcl export [path]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -o, --out                 Output directory for build (defaults to "export")

    ${chalk.dim('Example:')}

    - Export your scene into static files:

      ${chalk.green('$ dcl export')}
`

export async function main() {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--out': String,
    '-o': '--out'
  })

  if (args._[1]) {
    fail(ErrorType.INFO_ERROR, 'Please provide a target to retrieve data')
  }

  const workDir = args._[1] ? path.resolve(process.cwd(), args._[1]) : process.cwd()
  const exportDir = path.resolve(workDir, args['--out'] || 'export')

  spinner.create('Exporting project')

  if (await fs.pathExists(exportDir)) {
    await fs.remove(exportDir)
  }

  const ignoreFileContent = await fs.readFile(path.resolve(workDir, '.dclignore'), 'utf-8')
  const filePaths = await getProjectFilePaths(workDir, ignoreFileContent)

  const promises = filePaths.map(f => fs.copy(path.resolve(workDir, f), path.resolve(exportDir, f)))

  await Promise.all(promises)

  const artifactPath = path.resolve(workDir, 'node_modules', 'decentraland-ecs')
  const htmlPath = path.resolve(artifactPath, 'artifacts/preview.html')
  const ethConnectExists = await fs.pathExists(path.resolve(workDir, 'node_modules', 'eth-connect'))

  const html = (await fs.readFile(htmlPath, {
    encoding: 'utf8'
  })).replace(
    '<script src="/@/artifacts/preview.js"></script>',
    `<script>window.avoidWeb3=${!ethConnectExists}</script>\n<script src="preview.js"></script>`
  )

  const mappings = getDummyMappings(filePaths)

  await Promise.all([
    fs.writeFile(path.resolve(exportDir, 'index.html'), html, 'utf-8'),
    fs.writeFile(path.resolve(exportDir, 'mappings'), JSON.stringify(mappings), 'utf-8'),
    fs.copy(
      path.resolve(artifactPath, 'artifacts/preview.js'),
      path.resolve(exportDir, 'preview.js')
    )
  ])

  spinner.succeed('Export successful.')
}
