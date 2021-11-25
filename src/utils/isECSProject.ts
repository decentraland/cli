import { PackageJson } from './filesystem'

export default function isECSProject(pkg: PackageJson): boolean {
  return Object.keys(pkg.devDependencies || {}).some(
    (name) => name === 'decentraland-ecs'
  )
}