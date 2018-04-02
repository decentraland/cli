import * as path from 'path'
import * as uuidv4 from 'uuid/v4'
import { ensureFolder, pathExists, readFile, writeFile } from './filesystem'
import { isDev } from './env'
import { getDecentralandFolderPath } from './project'
const Analytics = require('analytics-node')

// Setup segment.io

const WRITE_KEY = 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
const SINGLEUSER = 'cli-user'
export const analytics = new Analytics(WRITE_KEY)

// List of tracked events
export const cliInstalled = track('Installed')
export const sceneCreated = track('Scene created')
export const preview = track('Preview started')
export const sceneUpload = track('Scene upload started')
export const sceneUploadSuccess = track('Scene upload success')
export const sceneLink = track('Scene ethereum link started')
export const sceneLinkSuccess = track('Scene ethereum link succeeded')
export const deploy = track('Scene deploy requested')
export const pinRequest = track('Pin requested')
export const pinSuccess = track('Pin success')

// TODO (dani): Hook deploy

export async function postInstall() {
  const userId = await getUserId()
  analytics.identify({
    SINGLEUSER,
    traits: {
      os: process.platform,
      createdAt: new Date().getTime(),
      devId: userId
    }
  })
}

// Helper "track" function

function track(eventName: string) {
  return async (properties = {}) => {
    // No reporting if running under development mode
    if (isDev) {
      return
    }
    const userId = await getUserId()
    analytics.track({
      userId: SINGLEUSER,
      event: eventName,
      properties: {
        ...properties,
        os: process.platform,
        devId: userId
      }
    })
  }
}

/**
 * Store a user id in the decentraland node module package
 */
async function getUserId() {
  await ensureFolder(getDecentralandFolderPath())

  const userIdFile = path.join(getDecentralandFolderPath(), 'userId')
  await pathExists(userIdFile)
  let userId

  if (await pathExists(userIdFile)) {
    userId = (await readFile(userIdFile)).toString()
  } else {
    userId = uuidv4()
    await writeFile(userIdFile, userId)
  }
  return userId
}
