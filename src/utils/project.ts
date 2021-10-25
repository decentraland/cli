import path from 'path'

export const SCENE_FILE = 'scene.json'
export const PACKAGE_FILE = 'package.json'
export const DCLIGNORE_FILE = '.dclignore'

/**
 * Composes the path to the `scene.json` file based on the provided path.
 * @param dir The path to the directory containing the scene file.
 */
export function getSceneFilePath(dir: string): string {
  return path.resolve(dir, SCENE_FILE)
}

/**
 * Composes the path to the `package.json` file based on the provided path.
 * @param dir The path to the directory containing the package.json file.
 */
export function getPackageFilePath(dir: string): string {
  return path.resolve(dir, PACKAGE_FILE)
}

/**
 * Composes the path to the `.dclignore` file based on the provided path.
 * @param dir The path to the directory containing the .dclignore file.
 */
export function getIgnoreFilePath(dir: string): string {
  return path.resolve(dir, DCLIGNORE_FILE)
}

/**
 * Returns the path to the node_modules directory.
 * @param dir The path to the directory containing the node_modules directory.
 */
export function getNodeModulesPath(dir: string): string {
  return path.resolve(dir, 'node_modules')
}
