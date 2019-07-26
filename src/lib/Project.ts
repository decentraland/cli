import * as path from 'path'
import * as dockerNames from 'docker-names'
import * as fs from 'fs-extra'
import * as ignore from 'ignore'

import { writeJSON, readJSON, isEmptyDirectory } from '../utils/filesystem'
import {
  getSceneFilePath,
  SCENE_FILE,
  getIgnoreFilePath,
  DCLIGNORE_FILE,
  PACKAGE_FILE,
  getPackageFilePath
} from '../utils/project'
import { fail, ErrorType } from '../utils/errors'
import { inBounds, getBounds, getObject, areConnected, Coords } from '../utils/coordinateHelpers'
import { SceneMetadata } from '../config'

export enum BoilerplateType {
  TYPESCRIPT_STATIC = 'ts-static',
  ECS = 'ecs',
  STATIC = 'static'
}

export interface IFile {
  path: string
  content: Buffer
  size: number
}

export class Project {
  private static MAX_FILE_SIZE = 524300000
  private workingDir: string
  private sceneFile: SceneMetadata

  constructor(workingDir: string) {
    this.workingDir = workingDir
  }

  /**
   * Returns `true` if the provided path contains a scene file
   */
  sceneFileExists(): Promise<boolean> {
    return fs.pathExists(getSceneFilePath(this.workingDir))
  }

  /**
   * Returns `true` if the project working directory is empty of files
   */
  async isProjectDirEmpty(): Promise<boolean> {
    return isEmptyDirectory(this.workingDir)
  }

  /**
   * Returns `true` for valid boilerplate types (`static`, `ts` and `ws`)
   * @param type
   */
  isValidBoilerplateType(type: string): boolean {
    return Object.values(BoilerplateType).includes(type)
  }

  /**
   * Returns an object containing the contents of the `scene.json` file.
   */
  async getSceneFile(): Promise<SceneMetadata> {
    if (this.sceneFile) {
      return this.sceneFile
    }

    try {
      this.sceneFile = await readJSON<SceneMetadata>(getSceneFilePath(this.workingDir))
    } catch (e) {
      fail(
        ErrorType.PROJECT_ERROR,
        `Unable to read 'scene.json' file. Try initializing the project using 'dcl init'`
      )
    }

    return this.sceneFile
  }

  /**
   * Scaffolds a project or fails for an invalid boilerplate type
   * @param boilerplateType `static`, `singleplayer` or `multiplayer`
   * @param websocketServer Optional websocket server URL
   */
  async scaffoldProject(boilerplateType: string, websocketServer?: string) {
    switch (boilerplateType) {
      case BoilerplateType.TYPESCRIPT_STATIC: {
        await this.copySample('ts-static')
        break
      }
      case BoilerplateType.STATIC: {
        await this.copySample('basic-static')
        break
      }
      case BoilerplateType.ECS: {
        await this.copySample('ecs')
        break
      }
    }
  }

  /**
   * Returns true if the project contains a package.json file and an empty node_modules folder
   */
  async needsDependencies(): Promise<boolean> {
    const files = await this.getAllFilePaths()
    const hasPackageFile = files.some(file => file === 'package.json')
    const nodeModulesPath = path.resolve(this.workingDir, 'node_modules')
    const hasNodeModulesFolder = await fs.pathExists(nodeModulesPath)
    const isNodeModulesEmpty = (await this.getAllFilePaths(nodeModulesPath)).length === 0

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
    const files = await this.getAllFilePaths()
    return files.some(file => file === 'tsconfig.json')
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
  writeSceneFile(content: Partial<SceneMetadata>): Promise<void> {
    return writeJSON(getSceneFilePath(this.workingDir), content)
  }

  /**
   * Copies the contents of a specific sample into the project (for scaffolding purposes).
   * Merges `scene.json` and `package.json` files
   * @param project The name of the sample folder (used as an indentifier).
   * @param destination The path to the project root. By default the current woxsrking directory.
   */
  async copySample(project: string) {
    const src = path.resolve(__dirname, '../..', 'samples', project)
    const files = await fs.readdir(src)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file === SCENE_FILE) {
        const sceneFile = await readJSON<SceneMetadata>(getSceneFilePath(src))
        await this.writeSceneFile(sceneFile)
      } else if (file === PACKAGE_FILE) {
        const pkgFile = await readJSON<any>(getPackageFilePath(src))
        await writeJSON(getPackageFilePath(this.workingDir), pkgFile)
      } else {
        await fs.copy(path.join(src, file), path.join(this.workingDir, file))
      }
    }
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
    return owner.toLowerCase()
  }

  /**
   * Fails the execution if one of the parcel data is invalid
   */
  async validateSceneOptions(): Promise<void> {
    const sceneFile = await this.getSceneFile()
    return this.validateSceneData(sceneFile)
  }

  /**
   * Returns a random project name
   */
  getRandomName(): string {
    return dockerNames.getRandomName() as string
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
      'dist'
    ].join('\n')
    await fs.outputFile(path.join(this.workingDir, DCLIGNORE_FILE), content)
    return content
  }

  /**
   * Validates all the conditions required for the creation of a new project.
   * Throws if a project already exists or if the directory is not empty.
   */
  async validateNewProject() {
    if (await this.sceneFileExists()) {
      fail(ErrorType.PROJECT_ERROR, 'Project already exists')
    }
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
        fail(ErrorType.PROJECT_ERROR, `Main scene file ${sceneFile.main} is missing`)
      }
    }
  }

  /**
   * Returns a promise of an array containing all the file paths for the given directory.
   * @param dir The given directory where to list the file paths.
   */
  async getAllFilePaths(dir: string = this.workingDir): Promise<string[]> {
    try {
      const files = await fs.readdir(dir)
      let tmpFiles: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const filePath = path.resolve(dir, file)
        const relativePath = path.relative(this.workingDir, filePath)
        const stat = await fs.stat(filePath)

        if (stat.isDirectory()) {
          const folderFiles = await this.getAllFilePaths(filePath)
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
  async getFiles(ignoreFile?: string): Promise<IFile[]> {
    const files = await this.getAllFilePaths()
    const filteredFiles = (ignore as any)()
      .add((ignoreFile || '').split(/\n/g).map($ => $.trim()))
      .filter(files)
    let data = []

    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i]
      const filePath = path.resolve(this.workingDir, file)
      const stat = await fs.stat(filePath)

      if (stat.size > Project.MAX_FILE_SIZE) {
        // MAX_FILE_SIZE is an arbitrary file size
        fail(
          ErrorType.UPLOAD_ERROR,
          `Maximum file size exceeded: '${file}' is larger than ${Project.MAX_FILE_SIZE} bytes`
        )
      }

      const content = await fs.readFile(filePath)

      data.push({
        path: file.replace(/\\/g, '/'),
        content: Buffer.from(content),
        size: stat.size
      })
    }

    return data
  }

  /**
   * Returns the the contents of the `.dclignore` file
   */
  async getDCLIgnore(): Promise<string | null> {
    let ignoreFile

    try {
      ignoreFile = await fs.readFile(getIgnoreFilePath(this.workingDir), 'utf8')
    } catch (e) {
      ignoreFile = null
    }

    return ignoreFile
  }

  /**
   * Returns `true` if the provided path contains a valid main file format.
   * @param path The path to the main file.
   */
  private isValidMainFormat(path: string): boolean {
    const supportedExtensions = new Set(['js', 'html', 'xml'])
    const mainExt = path ? path.split('.').pop() : null
    return path === null || supportedExtensions.has(mainExt)
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

    return fs.pathExists(path.join(this.workingDir, filePath))
  }

  /**
   * Fails the execution if one of the parcel data is invalid
   * @param sceneFile The JSON parsed file of scene.json
   */
  private validateSceneData(sceneFile: SceneMetadata): void {
    const { base, parcels } = sceneFile.scene
    const parcelSet = new Set(parcels)

    if (!base) {
      fail(ErrorType.PROJECT_ERROR, 'Missing scene base attribute at scene.json')
    }

    if (!parcels) {
      fail(ErrorType.PROJECT_ERROR, 'Missing scene parcels attribute at scene.json')
    }

    if (parcelSet.size < parcels.length) {
      fail(ErrorType.PROJECT_ERROR, 'There are duplicated parcels at scene.json')
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
}
