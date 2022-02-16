import path from 'path'
import fs from 'fs-extra'
import { readJSONSync } from '../utils/filesystem'
import { copySample, Project } from './Project'
import { sdk } from '@dcl/schemas'
import installDependencies from '../project/installDependencies'

interface WorkspaceProjectSchema {
  name?: string
  path: string
}

interface WorkspaceFileSchema {
  folders: WorkspaceProjectSchema[]
}

export const workspaceConfigFile = 'dcl-workspace.json'

function getProjectFolders(workspaceJsonPath: string): string[] {
  const workspaceJsonDir = path.dirname(workspaceJsonPath)
  if (fs.existsSync(workspaceJsonPath)) {
    try {
      const workspaceJson = readJSONSync<WorkspaceFileSchema>(workspaceJsonPath)
      if (workspaceJson.folders) {
        return workspaceJson.folders.map((folderPath) =>
          folderPath.path.startsWith('/') || folderPath.path.startsWith('\\')
            ? folderPath.path
            : `${workspaceJsonDir}/${folderPath.path}`
        )
      }
    } catch (err) {
      console.error(err)
    }
  }
  return []
}

export interface Workspace {
  getAllProjects: () => Project[]
  getProject: (index: number) => Project
  getSingleProject: () => Project | null
  isSingleProject: () => boolean
  hasPortableExperience: () => boolean
  getBaseCoords: () => Promise<{ x: number; y: number }>
}

export const createWorkspace = ({
  workingDir,
  workspaceFilePath
}: {
  workingDir?: string
  workspaceFilePath?: string
}): Workspace => {
  const projects: Project[] = []

  const workspaceJsonPath =
    workspaceFilePath ||
    path.resolve(workingDir || '', workspaceConfigFile) ||
    ''

  if (workspaceJsonPath === '') {
    throw new Error(`Couldn't find the workspace file or a working directory.`)
  }

  const projectFolders = getProjectFolders(workspaceJsonPath)
  if (projectFolders.length) {
    for (const projectFolder of projectFolders) {
      projects.push(new Project(projectFolder))
    }
  } else if (workingDir) {
    projects.push(new Project(workingDir))
  }

  if (projects.length === 0) {
    throw new Error(
      'At least one project has to have been read for the workspace.'
    )
  }
  const getAllProjects = () => {
    return projects
  }

  const getProject = (index: number = 0) => {
    return projects[index]
  }

  const isSingleProject = () => {
    return (
      projects.length === 1 && projects[0].getProjectWorkingDir() === workingDir
    )
  }

  const getSingleProject = (): Project | null => {
    return (isSingleProject() && projects[0]) || null
  }

  const hasPortableExperience = () => {
    return !!projects.find(
      (project) =>
        project.getInfo().sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE
    )
  }

  const getBaseCoords = async () => {
    const firstParcelScene = projects.find(
      (project) => project.getInfo().sceneType === sdk.ProjectType.SCENE
    )
    return firstParcelScene
      ? await firstParcelScene.getSceneBaseCoords()
      : { x: 0, y: 0 }
  }

  return {
    getAllProjects,
    getProject,
    getSingleProject,
    isSingleProject,
    hasPortableExperience,
    getBaseCoords
  }
}

export async function initializeWorkspace(
  workingDir: string
): Promise<Workspace> {
  const workingDirPaths = await fs.readdir(workingDir)
  const folders: WorkspaceProjectSchema[] = []

  for (const listedPath of workingDirPaths) {
    const projectWorkingDir = path.resolve(workingDir, listedPath)
    if ((await fs.stat(projectWorkingDir)).isDirectory()) {
      const project = new Project(projectWorkingDir)
      if (await project.sceneFileExists()) {
        folders.push({ path: listedPath })
      }
    }
  }

  if (!folders.length) {
    throw new Error(`There isn't any valid project in the sub folders.`)
  }

  const newWorkspace: WorkspaceFileSchema = { folders }
  await fs.writeJSON(
    path.resolve(workingDir, workspaceConfigFile),
    newWorkspace,
    { spaces: 2 }
  )
  await copySample('workspace', workingDir)
  await installDependencies(workingDir, false)

  return createWorkspace({ workingDir })
}
