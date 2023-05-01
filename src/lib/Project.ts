import path from 'path'
import fs from 'fs-extra'
import ignore from 'ignore'
import { Scene } from '@dcl/schemas'
import semver from 'semver'
import { v4 as uuidv4 } from 'uuid'

import { writeJSON, readJSON, isEmptyDirectory } from '../utils/filesystem'
import {
  getSceneFilePath,
  getIgnoreFilePath,
  DCLIGNORE_FILE,
  GITIGNORE_FILE,
  NPMRC_FILE,
  ESTLINTRC_FILE,
  WEARABLE_JSON_FILE,
  getNodeModulesPath
} from '../utils/project'
import { fail, ErrorType } from '../utils/errors'
import {
  inBounds,
  getBounds,
  getObject,
  areConnected,
  Coords
} from '../utils/coordinateHelpers'
import { getProjectInfo, ProjectInfo } from '../project/projectInfo'
import { getSceneFile } from '../sceneJson'
import { error } from '../utils/logging'
import { LinkerResponse } from './LinkerAPI'
import { getCLIPackageJson } from '../utils/moduleHelpers'

export interface IFile {
  path: string
  content: Buffer
  size: number
}

type DeployInfo = {
  linkerResponse?: LinkerResponse
  status?: 'deploying' | 'success'
}

export type ECSVersion = 'ecs6' | 'ecs7' | 'unknown'

export class Project {
  private static MAX_FILE_SIZE_BYTES = 50 * 1e6 // 50mb

  private projectWorkingDir: string
  private sceneFile: Scene | undefined
  private projectInfo: ProjectInfo
  private files: IFile[] = []
  private deployInfo: DeployInfo = {}

  constructor(projectWorkingDir: string) {
    this.projectWorkingDir = projectWorkingDir || process.cwd()
    const info = getProjectInfo(this.projectWorkingDir)

    if (!info) {
      throw new Error(`Unable to get project info of directory '${this.projectWorkingDir}'
      Please, see if its json configuration file is wrong.`)
    }
    this.projectInfo = info
  }

  getEcsVersion(): ECSVersion {
    const ecs6Path = path.resolve(
      this.projectWorkingDir,
      'node_modules',
      'decentraland-ecs'
    )

    const ecs7Path = path.resolve(
      this.projectWorkingDir,
      'node_modules',
      '@dcl',
      'sdk'
    )

    const ecs6 = fs.pathExistsSync(ecs6Path)
    const ecs7 = fs.pathExistsSync(ecs7Path)

    if (ecs6 && ecs7) {
      throw new Error(
        `Conflict initializing project of '${this.projectWorkingDir}' because it has both 'decentraland-ecs' and '@dcl/sdk' packages installed.`
      )
    } else if (ecs6) {
      return 'ecs6'
    } else if (ecs7) {
      return 'ecs7'
    }

    return 'unknown'
  }

  async getEcsPackageVersion() {
    const ecsVersion = this.getEcsVersion()

    if (ecsVersion === 'unknown') {
      return {
        ecsVersion,
        packageVersion: 'none'
      }
    }

    const ecsPackageName =
      ecsVersion === 'ecs7' ? '@dcl/sdk' : 'decentraland-ecs'
    const ecsPackageJson = await readJSON<{
      version: string
    }>(
      path.resolve(
        getNodeModulesPath(this.projectWorkingDir),
        ecsPackageName,
        'package.json'
      )
    )

    return {
      ecsVersion,
      packageVersion: ecsPackageJson.version
    }
  }

  setDeployInfo(value: Partial<DeployInfo>) {
    this.deployInfo = { ...this.deployInfo, ...value }
  }

  getDeployInfo() {
    return this.deployInfo
  }

  getProjectWorkingDir() {
    return this.projectWorkingDir
  }

  getInfo(): ProjectInfo {
    return this.projectInfo
  }

  /**
   * Returns `true` if the provided path contains a scene file
   */
  sceneFileExists(): Promise<boolean> {
    return fs.pathExists(getSceneFilePath(this.projectWorkingDir))
  }

  /**
   * Returns `true` if the project working directory is empty of files
   */
  async isProjectDirEmpty(): Promise<boolean> {
    return isEmptyDirectory(this.projectWorkingDir)
  }

  /**
   * Returns an object containing the contents of the `scene.json` file.
   */
  async getSceneFile(): Promise<Scene> {
    if (this.sceneFile) {
      return this.sceneFile
    }

    try {
      const sceneFile = await readJSON<Scene>(
        getSceneFilePath(this.projectWorkingDir)
      )
      this.sceneFile = sceneFile
      return sceneFile
    } catch (e) {
      fail(
        ErrorType.PROJECT_ERROR,
        `Unable to read 'scene.json' file. Try initializing the project using 'dcl init'.
        \t > Folder: ${this.projectWorkingDir}
        `
      )
    }
    return this.sceneFile!
  }

  /**
   * Returns true if the project contains a package.json file and an empty node_modules folder
   */
  async needsDependencies(): Promise<boolean> {
    const files = await this.getAllFilePaths({
      dir: this.projectWorkingDir,
      rootFolder: this.projectWorkingDir
    })
    const hasPackageFile = files.some((file) => file === 'package.json')
    const nodeModulesPath = path.resolve(this.projectWorkingDir, 'node_modules')
    const hasNodeModulesFolder = await fs.pathExists(nodeModulesPath)
    const isNodeModulesEmpty =
      (
        await this.getAllFilePaths({
          dir: nodeModulesPath,
          rootFolder: this.projectWorkingDir
        })
      ).length === 0

    if (hasPackageFile && (!hasNodeModulesFolder || isNodeModulesEmpty)) {
      return true
    }

    return false
  }

  /**
   * Returns true if te project root contains a `tsconfig.json` file
   * @param dir
   */
  async isTypescriptProject(): Promise<boolean> {
    const files = await this.getAllFilePaths({
      dir: this.projectWorkingDir,
      rootFolder: this.projectWorkingDir
    })
    return files.some((file) => file === 'tsconfig.json')
  }

  /**
   * Writes the provided websocket server to the `scene.json` file
   * @param server The url to a websocket server
   */
  async scaffoldWebsockets(server: string) {
    await this.copySample('websockets')

    if (server) {
      await this.writeSceneFile({ main: server })
    }
  }

  /**
   * Creates a new `scene.json` file
   * @param path The path to the directory where the file will be written.
   */
  writeSceneFile(content: Partial<Scene>): Promise<void> {
    return writeJSON(getSceneFilePath(this.projectWorkingDir), content)
  }

  /**
   * Copies the contents of a specific sample into the project (for scaffolding purposes).
   * Merges `scene.json` and `package.json` files
   * @param project The name of the sample folder (used as an indentifier).
   * @param destination The path to the project root. By default the current woxsrking directory.
   */
  async copySample(project: string) {
    await copySample(project, this.projectWorkingDir)
  }

  /**
   * Returns a promise of an object containing the base X and Y coordinates for a parcel.
   */
  async getParcelCoordinates(): Promise<Coords> {
    const sceneFile = await this.getSceneFile()
    const { base } = sceneFile.scene
    return getObject(base)
  }

  /**
   * Returns a promise of an array of the parcels of the scene
   */
  async getParcels(): Promise<Coords[]> {
    const sceneFile = await this.getSceneFile()
    return sceneFile.scene.parcels.map(getObject)
  }

  /**
   * Returns a promise of the owner address
   */
  async getOwner(): Promise<string> {
    const { owner } = await this.getSceneFile()
    if (!owner) {
      fail(
        ErrorType.PROJECT_ERROR,
        `Missing owner attribute at scene.json. Owner attribute is required for deploying`
      )
    }
    return owner?.toLowerCase() || ''
  }

  /**
   * Fails the execution if one of the parcel data is invalid
   */
  async validateSceneOptions(): Promise<void> {
    const sceneFile = await this.getSceneFile()
    return this.validateSceneData(sceneFile)
  }

  /**
   * Writes the `.dclignore` file to the provided directory path.
   * @param dir The target path where the file will be
   */
  async writeDclIgnore(): Promise<string> {
    const content = [
      '.*',
      'package.json',
      'package-lock.json',
      'yarn-lock.json',
      'build.json',
      'export',
      'tsconfig.json',
      'tslint.json',
      'node_modules',
      '*.ts',
      '*.tsx',
      'Dockerfile',
      'dist',
      'README.md',
      '*.blend',
      '*.fbx',
      '*.zip',
      '*.rar'
    ].join('\n')
    await fs.outputFile(
      path.join(this.projectWorkingDir, DCLIGNORE_FILE),
      content
    )
    return content
  }

  /**
   * Validates all the conditions required to operate over an existing project.
   * Throws if a project contains an invalid main path or if the `scene.json` file is missing.
   */
  async validateExistingProject() {
    const sceneFile = await this.getSceneFile()

    if (!this.isWebSocket(sceneFile.main)) {
      if (!this.isValidMainFormat(sceneFile.main)) {
        fail(
          ErrorType.PROJECT_ERROR,
          `Main scene format file (${sceneFile.main}) is not a supported format`
        )
      }

      if (sceneFile.main !== null && !(await this.fileExists(sceneFile.main))) {
        fail(
          ErrorType.PROJECT_ERROR,
          `Main scene file ${sceneFile.main} is missing in folder ${this.projectWorkingDir}`
        )
      }
    }
  }

  /**
   * Returns a promise of an array containing all the file paths for the given directory.
   * @param dir The given directory where to list the file paths.
   */
  async getAllFilePaths(
    { dir, rootFolder }: { dir: string; rootFolder: string } = {
      dir: this.projectWorkingDir,
      rootFolder: this.projectWorkingDir
    }
  ): Promise<string[]> {
    try {
      const files = await fs.readdir(dir)
      let tmpFiles: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const filePath = path.resolve(dir, file)
        const relativePath = path.relative(rootFolder, filePath)
        const stat = await fs.stat(filePath)

        if (stat.isDirectory()) {
          const folderFiles = await this.getAllFilePaths({
            dir: filePath,
            rootFolder
          })
          tmpFiles = tmpFiles.concat(folderFiles)
        } else {
          tmpFiles.push(relativePath)
        }
      }

      return tmpFiles
    } catch (e) {
      return []
    }
  }

  /**
   * Returns a promise of an array of objects containing the path and the content for all the files in the project.
   * All the paths added to the `.dclignore` file will be excluded from the results.
   * Windows directory separators are replaced for POSIX separators.
   * @param ignoreFile The contents of the .dclignore file
   */
  async getFiles({
    ignoreFiles = '',
    cache = false,
    skipFileSizeCheck = false
  }: {
    ignoreFiles?: string
    cache?: boolean
    skipFileSizeCheck?: boolean
  } = {}): Promise<IFile[]> {
    if (cache && this.files.length) {
      return this.files
    }

    const files = await this.getAllFilePaths()
    const filteredFiles = (ignore as any)()
      .add(ignoreFiles.split(/\n/g).map(($) => $.trim()))
      .filter(files)
    const data = []

    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i]
      const filePath = path.resolve(this.projectWorkingDir, file)
      const stat = await fs.stat(filePath)

      if (stat.size > Project.MAX_FILE_SIZE_BYTES && !skipFileSizeCheck) {
        fail(
          ErrorType.UPLOAD_ERROR,
          `Maximum file size exceeded: '${file}' is larger than ${
            Project.MAX_FILE_SIZE_BYTES / 1e6
          }MB`
        )
      }

      const content = await fs.readFile(filePath)

      data.push({
        path: file.replace(/\\/g, '/'),
        content: Buffer.from(content),
        size: stat.size
      })
    }
    this.files = data
    return data
  }

  /**
   * Returns the the contents of the `.dclignore` file
   */
  async getDCLIgnore(): Promise<string | null> {
    let ignoreFile

    try {
      ignoreFile = await fs.readFile(
        getIgnoreFilePath(this.projectWorkingDir),
        'utf8'
      )
    } catch (e) {
      ignoreFile = null
    }

    return ignoreFile
  }

  /**
   * Returns `true` if the provided path contains a valid main file format.
   * @param path The path to the main file.
   */
  private isValidMainFormat(path: string | null): boolean {
    const supportedExtensions = new Set(['js', 'html', 'xml'])
    const mainExt = path ? path.split('.').pop() : null
    return path === null || !!(mainExt && supportedExtensions.has(mainExt))
  }

  /**
   * Returns true if the given URL is a valid websocket URL.
   * @param url The given URL.
   */
  private isWebSocket(url: string): boolean {
    return /wss?\:\/\//gi.test(url)
  }

  /**
   * Returns `true` if the path exists as a valid file or websocket URL.
   * @param filePath The path to a given file.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    if (this.isWebSocket(filePath)) {
      return true
    }

    return fs.pathExists(path.join(this.projectWorkingDir, filePath))
  }

  /**
   * Fails the execution if one of the parcel data is invalid
   * @param sceneFile The JSON parsed file of scene.json
   */
  private validateSceneData(sceneFile: Scene): void {
    const { base, parcels } = sceneFile.scene
    const parcelSet = new Set(parcels)

    if (!base) {
      fail(
        ErrorType.PROJECT_ERROR,
        'Missing scene base attribute at scene.json'
      )
    }

    if (!parcels) {
      fail(
        ErrorType.PROJECT_ERROR,
        'Missing scene parcels attribute at scene.json'
      )
    }

    if (parcelSet.size < parcels.length) {
      fail(
        ErrorType.PROJECT_ERROR,
        `There are duplicated parcels at scene.json. Project folder ${this.projectWorkingDir}`
      )
    }

    if (!parcelSet.has(base)) {
      fail(
        ErrorType.PROJECT_ERROR,
        `Your base parcel ${base} should be included on parcels attribute at scene.json`
      )
    }

    const objParcels = parcels.map(getObject)
    objParcels.forEach(({ x, y }) => {
      if (inBounds(x, y)) {
        return
      }
      const { minX, maxX } = getBounds()
      fail(
        ErrorType.PROJECT_ERROR,
        `Coordinates ${x},${y} are outside of allowed limits (from ${minX} to ${maxX})`
      )
    })

    if (!areConnected(objParcels)) {
      fail(
        ErrorType.PROJECT_ERROR,
        'Parcels described on scene.json are not connected. They should be one next to each other'
      )
    }
  }

  async getSceneBaseCoords() {
    try {
      const sceneFile = await getSceneFile(this.projectWorkingDir)
      const [x, y] = sceneFile.scene.base.replace(/\ /g, '').split(',')
      return { x: parseInt(x), y: parseInt(y) }
    } catch (e) {
      console.log(error(`Could not open "scene.json" file`))
      throw e
    }
  }

  async getSceneParcelCount() {
    try {
      const sceneFile = await getSceneFile(this.projectWorkingDir)
      return sceneFile.scene.parcels.length
    } catch (e) {
      console.log(error(`Could not open "scene.json" file`))
      throw e
    }
  }

  async checkCLIandECSCompatibility() {
    const ecsVersion = this.getEcsVersion()
    if (ecsVersion === 'unknown') {
      throw new Error(
        'There is no SDK installed to know how version should use. Please run `npm install`.'
      )
    }

    const ecsPackageName =
      ecsVersion === 'ecs7' ? '@dcl/sdk' : 'decentraland-ecs'
    const ecsPackageJson = await readJSON<{
      minCliVersion?: string
      version: string
    }>(
      path.resolve(
        getNodeModulesPath(this.projectWorkingDir),
        ecsPackageName,
        'package.json'
      )
    )

    const cliPackageJson = await getCLIPackageJson<{
      minEcsVersion?: boolean
      version: string
    }>()

    if (ecsVersion === 'ecs6') {
      if (
        cliPackageJson.minEcsVersion &&
        semver.lt(ecsPackageJson.version, `${cliPackageJson.minEcsVersion}`)
      ) {
        throw new Error(
          [
            'This version of decentraland-cli (dcl) requires an ECS version higher than',
            cliPackageJson.minEcsVersion,
            'the installed version is',
            ecsPackageJson.version,
            'please go to https://docs.decentraland.org/development-guide/installation-guide/ to know more about the versions and upgrade guides'
          ].join(' ')
        )
      }
    }

    if (
      ecsPackageJson.minCliVersion &&
      semver.lt(cliPackageJson.version, ecsPackageJson.minCliVersion)
    ) {
      throw new Error(
        [
          `This version of ${ecsPackageName} requires a version of the ECS decentraland-cli (dcl) higher than`,
          ecsPackageJson.minCliVersion,
          'the installed version is',
          cliPackageJson.version,
          'please go to https://docs.decentraland.org/development-guide/installation-guide/ to know more about the versions and upgrade guides'
        ].join(' ')
      )
    }
  }
}

export async function copySample(
  projectSample: string,
  destWorkingDir: string
) {
  const src = path.resolve(__dirname, '..', '..', 'samples', projectSample)
  const files = await fs.readdir(src)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file === WEARABLE_JSON_FILE) {
      const wearableJsonFile = await readJSON<any>(path.join(src, file))
      const wearableJsonFileWithUuid = { ...wearableJsonFile, id: uuidv4() }
      await writeJSON(path.join(destWorkingDir, file), wearableJsonFileWithUuid)
    } else if (
      file === GITIGNORE_FILE ||
      file === NPMRC_FILE ||
      file === ESTLINTRC_FILE
    ) {
      await fs.copy(path.join(src, file), path.join(destWorkingDir, '.' + file))
    } else {
      await fs.copy(path.join(src, file), path.join(destWorkingDir, file))
    }
  }
}
