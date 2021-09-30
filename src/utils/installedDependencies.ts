import * as fs from 'fs-extra'
import * as path from 'path'
import { readJSON, PackageJson } from './filesystem'

type DecentralandPackage = PackageJson<{ decentralandLibrary: string }>

type Dependencies = Pick<
  PackageJson,
  'dependencies' | 'devDependencies' | 'bundledDependencies' | 'peerDependencies'
>

const parseBundled = (dependencies: unknown) => {
  if (dependencies instanceof Array) {
    return dependencies
  }
  return []
}

export function getDependencies(packageJSON: PackageJson): Required<Dependencies> {
  const {
    bundleDependencies = [],
    bundledDependencies = [],
    dependencies = {},
    devDependencies = {},
    peerDependencies = {}
  } = packageJSON
  const bundled = [
    ...parseBundled(bundleDependencies),
    ...parseBundled(bundledDependencies)
  ].filter(b => typeof b === 'string')

  return {
    dependencies,
    devDependencies,
    peerDependencies,
    bundledDependencies: bundled
  }
}

function getPath(workDir: string, name: string) {
  return path.resolve(workDir, 'node_modules', name, 'package.json')
}

export async function getDecentralandDependencies(
  dependencies: Record<string, string>,
  workDir: string
): Promise<string[]> {
  const dependenciesName = []
  for (let dependency of Object.keys(dependencies)) {
    const modulePath = getPath(workDir, dependency)

    if (fs.pathExistsSync(modulePath)) {
      const pkgJson = await readJSON<DecentralandPackage>(modulePath)
      if (pkgJson.decentralandLibrary && pkgJson.name && pkgJson.version) {
        dependenciesName.push(dependency)
      }
    }
  }

  return dependenciesName
}
