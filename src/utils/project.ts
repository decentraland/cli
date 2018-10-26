import * as path from 'path'

export interface IProjectFile {
  id: string
}

export const SCENE_FILE = 'scene.json'
export const PROJECT_FILE = 'project.json'
export const PACKAGE_FILE = 'package.json'
export const DECENTRALAND_FOLDER = '.decentraland'
export const DCLIGNORE_FILE = '.dclignore'

/**
 * Composes the path to the `.decentraland` folder based on the provided path.
 * @param dir The path to the directory containing the decentraland folder.
 */
export function getDecentralandFolderPath(dir: string): string {
  return path.resolve(dir, DECENTRALAND_FOLDER)
}

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
 * Composes the path to the `project.json` file based on the provided path.
 * @param dir The path to the directory containing the project file. By default the `.decentraland` folder.
 */
export function getProjectFilePath(dir: string): string {
  return path.resolve(dir, DECENTRALAND_FOLDER, PROJECT_FILE)
}

/**
 * Returns the path to the current working directory.
 */
export function getRootPath(): string {
  return process.cwd()
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
