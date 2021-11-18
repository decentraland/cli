import path from 'path'
import fs from 'fs-extra'

import { readJSON, PackageJson } from '../utils/filesystem'
import {
  getDecentralandDependencies,
  getDependencies
} from '../utils/installedDependencies'
import * as spinner from '../utils/spinner'

export default async function () {
  try {
    spinner.create('Checking decentraland libraries')

    const workDir = process.cwd()
    const packageJsonDir = path.resolve(workDir, 'package.json')
    const packageJSON = await readJSON<PackageJson>(packageJsonDir)
    const pkgDependencies = getDependencies(packageJSON)
    const decentralandDependencies = await getDecentralandDependencies(
      { ...pkgDependencies.dependencies, ...pkgDependencies.devDependencies },
      workDir
    )

    const missingBundled = !!decentralandDependencies.find(
      (name) => !pkgDependencies.bundledDependencies.includes(name)
    )

    if (missingBundled) {
      const allBundledDependencies = new Set([
        ...pkgDependencies.bundledDependencies,
        ...decentralandDependencies
      ])
      const { bundledDependencies, bundleDependencies, ...packageJsonProps } =
        packageJSON
      const newPackage = {
        ...packageJsonProps,
        bundledDependencies: Array.from(allBundledDependencies)
      }

      await fs.writeFile(packageJsonDir, JSON.stringify(newPackage, null, 2))
    }
    spinner.succeed()
  } catch (e) {
    spinner.fail()
    throw e
  }
}
