import path from 'path'
import fs from 'fs-extra'
import { readJSONSync } from '../utils/filesystem'
import { Project } from './Project'

export class Workspace {
  private workingDir: string
  private projects: Project[] = []

  constructor(workingDir: string) {
    this.workingDir = workingDir

    const projectFolders = this.getProjectFolders()
    if (projectFolders.length > 0) {
      for (const projectFolder of projectFolders) {
        this.projects.push(new Project(projectFolder))
      }
    } else {
      this.projects.push(new Project(workingDir))
    }

    if (this.projects.length === 0) {
      throw new Error(
        'At least one project has to have been read for the workspace.'
      )
    }
  }

  getAllProjects() {
    return this.projects
  }

  getProject(index: number = 0) {
    return this.projects[index]
  }

  getSingleProject(): Project | null {
    if (
      this.projects.length === 1 &&
      this.projects[0].getProjectWorkingDir() === this.workingDir
    ) {
      return this.getProject(0)
    }
    return null
  }

  isSingleProject() {
    return (
      this.projects.length === 1 &&
      this.projects[0].getProjectWorkingDir() === this.workingDir
    )
  }

  private getProjectFolders(): string[] {
    const workspaceJsonPath = path.resolve(
      this.workingDir,
      'dcl-workspace.json'
    )

    if (fs.existsSync(workspaceJsonPath)) {
      try {
        const workspaceJson = readJSONSync<any>(workspaceJsonPath)
        if (workspaceJson?.folders) {
          const folders = workspaceJson.folders as { path: string }[]

          return folders.map((ppath) =>
            ppath.path.startsWith('/') || ppath.path.startsWith('\\')
              ? ppath.path
              : `${this.workingDir}/${ppath.path}`
          )
        }
      } catch (err) {
        console.error(err)
      }
    }
    return []
  }
}
