import { PackageJson } from './filesystem'
import path from 'path'
import fs from 'fs-extra'

export default function isECSProject(pkg: PackageJson): boolean {
  return Object.keys(pkg.devDependencies || {}).some(
    (name) => name === 'decentraland-ecs'
  )
}

export function isPortableExperience(workDir: string) {
  const assetJsonPath = path.resolve(workDir, './asset.json')
  if (fs.existsSync(assetJsonPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const assetJson = require(assetJsonPath)
      if (assetJson.assetType === 'portable-experience') {
        return true
      }
    } catch (err) {
      console.error(`Unable to load asset.json properly`, err)
    }
  }
  return false
}
