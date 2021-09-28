import { readJSON } from '../utils/filesystem'
import getDecentralandLibraries from '../project/decentralandLibraries'
import * as path from 'path'
import * as spinner from '../utils/spinner'
import * as fs from 'fs-extra'

export default async function() {
  spinner.create('Checking decentraland libraries')

  const { decentralandLibraries } = await getDecentralandLibraries(process.cwd())
  let bundledLibs: string[] = []
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const packageJson = await readJSON<{ bundleDependencies: string[] }>(packageJsonPath)

  if (packageJson.bundleDependencies instanceof Array) {
    packageJson.bundleDependencies.forEach(($, ix) => {
      if (typeof $ === 'string') {
        bundledLibs.push($)
      } else {
        spinner.fail()
        throw Error(
          `! Error: package.json .bundleDependencies must be an array of strings. The element number bundleDependencies[${ix}] is not a string.`
        )
      }
    })
  } else if (packageJson.bundleDependencies) {
    spinner.fail()
    throw Error(`! Error: package.json .bundleDependencies must be an array of strings.`)
  }

  let missingBundledLibs: string[] = decentralandLibraries
    .filter($ => !bundledLibs.includes($.name))
    .map($ => $.name)
  if (missingBundledLibs.length > 0) {
    spinner.info('Some decentraland libraries are missing in bundleDependencies.')

    for (const lib of missingBundledLibs) {
      bundledLibs.push(lib)
    }

    packageJson.bundleDependencies = bundledLibs
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))

    spinner.succeed(`Decentraland libraries were added to bundleDependencies.\n`)
  } else {
    spinner.succeed(`Decentraland libraries.\n`)
  }
}
