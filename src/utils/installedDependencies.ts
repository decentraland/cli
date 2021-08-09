import { spawn } from 'child_process'
import { npm } from './moduleHelpers'
import * as spinner from '../utils/spinner'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs-extra'

type ModuleItem = {
  name: string
  path: string
  main: boolean
}

async function getDependencyTree(workingDir: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['ls', '--json'], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV: '' }
    })

    let data: string = ''
    child.stdout.on('data', function($) {
      data += $.toString()
    })

    child.on('close', code => {
      if (code !== 0) {
        spinner.fail()
        reject(
          new Error(
            `${chalk.bold(
              `npm ls --json`
            )} exited with code ${code}. Please try running the command manually`
          )
        )
      }

      let dependenciesJson: Object
      try {
        dependenciesJson = JSON.parse(data) as Object
      } catch (err) {
        reject(err)
      }

      resolve(dependenciesJson)
    })
  })
}

async function getInstalledDependencies(
  workingDir: string
): Promise<{ dependencies: ModuleItem[] }> {
  let dependenciesList: ModuleItem[] = []
  const dependencyTree = (await getDependencyTree(workingDir)) as { dependencies: Object }

  for (const name of Object.keys(dependencyTree.dependencies)) {
    const modulePath = path.resolve(
      `${path.resolve(workingDir, 'node_modules')}/${name}/package.json`
    )
    if (fs.pathExistsSync(modulePath)) {
      dependenciesList.push({
        name,
        path: modulePath,
        main: true
      })
    }
  }

  return { dependencies: dependenciesList }
}
export default getInstalledDependencies
