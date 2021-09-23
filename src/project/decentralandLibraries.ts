import { readJSON } from '../utils/filesystem'
import getInstalledDependencies from '../utils/installedDependencies'

type BasicPackageInformation = {
  decentralandLibrary?: any
  name?: string
  version?: string
}

/**
 * Filter by decentraland libraries in all installed dependencies
 * @param dir The path to the directory containing the scene file.
 * @returns object with decentralandLibraries field with array of objects with dependency information
 */
const getMainDecentralandLibraries = async (
  workingDir: string
): Promise<{ decentralandLibraries: BasicPackageInformation[] }> => {
  const { dependencies } = await getInstalledDependencies(workingDir)
  let decentralandLibraries: BasicPackageInformation[] = []

  for (const dependency of dependencies) {
    if (dependency.main) {
      const dependencyPackage = await readJSON<BasicPackageInformation>(dependency.path)

      if (dependencyPackage.decentralandLibrary !== undefined) {
        if (dependencyPackage.name && dependencyPackage.version) {
          decentralandLibraries.push({
            name: dependencyPackage.name,
            version: dependencyPackage.version,
            decentralandLibrary: dependencyPackage.decentralandLibrary
          })
        } else {
          console.error(
            `Error with decentraland library: name or version invalid. Module item ${dependencyPackage}`
          )
        }
      } else {
        // It isn't a decentraland library but, can it have one?
      }
    } else {
      // It isn't a dependency of scene
    }
  }

  return { decentralandLibraries }
}

export default getMainDecentralandLibraries
