import * as fs from 'fs-extra'
import * as uuid from 'uuid'
import dockerNames = require('docker-names')
import * as path from 'path'
import { writeJSON, readJSON, ensureFolder } from '../utils/filesystem'
import {
  getSceneFilePath,
  getProjectFilePath,
  getRootPath,
  SCENE_FILE,
  getIgnoreFilePath,
  IProjectFile,
  DCLIGNORE_FILE
} from '../utils/project'
import * as parser from 'gitignore-parser'
import { IIPFSFile } from './IPFS'
import { fail, ErrorType } from '../utils/errors'

export enum BoilerplateType {
  STATIC = 'static',
  TYPESCRIPT = 'singleplayer',
  WEBSOCKETS = 'multiplayer-experimental'
}

export class Project {
  /**
   * Returns `true` if the provided path contains a scene file
   */
  sceneFileExists(): Promise<boolean> {
    return fs.pathExists(getSceneFilePath())
  }

  /**
   * Returns `true` for valid boilerplate types (`static`, `ts` and `ws`)
   * @param type
   */
  isValidBoilerplateType(type: string): boolean {
    for (let key in BoilerplateType) {
      if (type === BoilerplateType[key]) {
        return true
      }
    }
    return false
  }

  /**
   * Returns an object containing the contents of the `project.json` file.
   */
  async getProjectFile(): Promise<IProjectFile> {
    return readJSON<IProjectFile>(getProjectFilePath())
  }

  /**
   * Returns an object containing the contents of the `scene.json` file.
   */
  async getSceneFile(): Promise<DCL.SceneMetadata> {
    return readJSON<DCL.SceneMetadata>(getSceneFilePath())
  }

  /**
   * Creates the `project.json` file and all other mandatory folders.
   * @param dirName The directory where the project file will be created.
   */
  async initProject(dirName: string = getRootPath()) {
    await this.writeProjectFile(dirName, {
      id: uuid.v4(),
      ipns: null
    } as IProjectFile)

    await ensureFolder(path.join(dirName, 'audio'))
    await ensureFolder(path.join(dirName, 'models'))
    await ensureFolder(path.join(dirName, 'textures'))
  }

  async scaffoldProject(boilerplateType: string, websocketServer?: string) {
    if (!this.isValidBoilerplateType(boilerplateType)) {
      fail(
        ErrorType.PROJECT_ERROR,
        `Invalid boilerplate type: '${boilerplateType}'. Supported types are 'static', 'singleplayer' and 'multiplayer-experimental'.`
      )
    }

    switch (boilerplateType) {
      case BoilerplateType.TYPESCRIPT: {
        await this.copySample('basic-ts')
        break
      }
      case BoilerplateType.WEBSOCKETS:
        this.scaffoldWebsockets(websocketServer)
        break
      case BoilerplateType.STATIC:
      default:
        await this.copySample('basic-static')
        break
    }
  }

  async hasDependencies(dir: string = getRootPath()): Promise<boolean> {
    const files = await this.getAllFilePaths()
    return files.some(file => file === 'package.json')
  }

  async isTypescriptProject(dir: string = getRootPath()): Promise<boolean> {
    const files = await this.getAllFilePaths()
    return files.some(file => file === 'package.json')
  }

  /**
   * Writes the provided websocket server to the `scene.json` file
   * @param server The url to a websocket server
   */
  scaffoldWebsockets(server: string) {
    this.copySample('websockets')
  }

  /**
   * Creates a new `project.json` file
   * @param path The path to the project directory where the `.decentraland` folder will be located.
   */
  writeProjectFile(path: string, content: any): Promise<void> {
    return writeJSON(getProjectFilePath(path), content)
  }

  /**
   * Creates a new `scene.json` file
   * @param path The path to the directory where the file will be written.
   */
  writeSceneFile(dir: string, content: DCL.SceneMetadata): Promise<void> {
    return writeJSON(getSceneFilePath(dir), content)
  }

  /**
   * Copies the contents of a specific sample into the project (for scaffolding purposes).
   * @param project The name of the sample folder (used as an indentifier).
   * @param destination The path to the project root. By default the current working directory.
   */
  async copySample(project: string, destination: string = process.cwd()) {
    const src = path.resolve(__dirname, '..', 'samples', project)
    const files = await fs.readdir(src)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file === SCENE_FILE) {
        const sceneFile = await readJSON<DCL.SceneMetadata>(getSceneFilePath(src))
        this.writeSceneFile(destination, sceneFile)
      } else {
        await fs.copy(path.join(src, file), path.join(destination, file))
      }
    }
  }

  /**
   * Returns a promise of an object containing the base X and Y coordinates for a parcel.
   */
  async getParcelCoordinates(): Promise<{ x: number; y: number }> {
    const sceneFile = await readJSON<DCL.SceneMetadata>(getSceneFilePath())
    const [x, y] = sceneFile.scene.base.split(',')
    return { x: parseInt(x, 10), y: parseInt(y, 10) }
  }

  /**
   * Returns a random project name
   */
  getRandomName(): string {
    return dockerNames.getRandomName()
  }

  /**
   * Writes the `.dclignore` file to the provided directory path.
   * @param dir The target path where the file will be
   */
  writeDclIgnore(dir: string = getRootPath()): Promise<void> {
    return fs.outputFile(
      path.join(dir, DCLIGNORE_FILE),
      [
        '.*',
        'package.json',
        'package-lock.json',
        'yarn-lock.json',
        'build.json',
        'tsconfig.json',
        'tslint.json',
        'node_modules/',
        '**/node_modules/*',
        '*.ts',
        '*.tsx',
        'dist/'
      ].join('\n')
    )
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
    let sceneFile

    try {
      sceneFile = await readJSON<DCL.SceneMetadata>(getSceneFilePath())
    } catch (e) {
      fail(ErrorType.PROJECT_ERROR, `Unable to read 'scene.json' file. Try initializing the project using 'dcl init'`)
    }

    if (!this.isWebSocket(sceneFile.main)) {
      if (!this.isValidMainFormat(sceneFile.main)) {
        fail(ErrorType.PROJECT_ERROR, `Main scene format file (${sceneFile.main}) is not a supported format`)
      }

      if (!await this.fileExists(sceneFile.main)) {
        fail(ErrorType.PROJECT_ERROR, `Main scene file ${sceneFile.main} is missing`)
      }
    }
  }

  /**
   * Returns a promise of an array containing all the file paths for the given directory.
   * @param dir The given directory where to list the file paths.
   */
  async getAllFilePaths(dir: string = getRootPath()): Promise<string[]> {
    try {
      const files = await fs.readdir(dir)
      let tmpFiles: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const filePath = path.join(dir, file)
        const stat = await fs.stat(filePath)
        if (stat.isDirectory()) {
          tmpFiles.concat(await this.getAllFilePaths(filePath))
        } else {
          tmpFiles.push(filePath)
        }
      }
      return tmpFiles.map(file => path.relative(dir, file))
    } catch (e) {
      return []
    }
  }

  /**
   * Returns a promise of an array of objects containing the path and the content for all the files in the project.
   * All the paths added to the `.dclignore` file will be excluded from the results.
   */
  async getFiles(): Promise<IIPFSFile[]> {
    const files = await this.getAllFilePaths()
    const dclignore = parser.compile(await this.getDCLIgnore())
    let data = []

    files.filter(dclignore.accepts).forEach(async (name: string) =>
      data.push({
        path: `/tmp/${name}`,
        content: new Buffer(await fs.readFile(name))
      })
    )

    return data
  }

  private getDCLIgnore(): Promise<string> {
    return fs.readFile(getIgnoreFilePath(), 'utf8')
  }

  /**
   * Returns `true` if the provided path contains a valid main file format.
   * @param path The path to the main file.
   */
  private isValidMainFormat(path: string): boolean {
    const supportedExtensions = ['js', 'html', 'xml']
    const mainExt = path.split('.').pop()
    const isValid = supportedExtensions.find(ext => ext === mainExt)
    return !!isValid
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

    return fs.pathExists(path.join(getRootPath(), filePath))
  }
}
