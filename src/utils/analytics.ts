import { v4 as uuidv4 } from 'uuid'
import AnalyticsNode from 'analytics-node'
import { createDCLInfo, getConfig } from '../config'
import { isOnline, getInstalledCLIVersion } from './moduleHelpers'
import { debug } from './logging'
import chalk from 'chalk'
import { IPFSv2 } from '@dcl/schemas'

// Setup segment.io
const SINGLEUSER = 'cli-user'

export let analytics: AnalyticsNode

const ANONYMOUS_DATA_QUESTION = 'Send Anonymous data'

function isCI() {
  return process.env.CI === 'true' || process.argv.includes('--ci') || process.argv.includes('--c')
}

function isEditor() {
  return process.env.EDITOR === 'true'
}

export type AnalyticsProject = {
  projectHash?: string
  ecs?: {
    ecsVersion: string
    packageVersion: string
  }
  coords?: { x: number; y: number }
  parcelCount?: number
  isWorkspace: boolean
}

export type SceneDeploySuccess = Omit<AnalyticsProject, 'isWorkspace'> & {
  isWorld: boolean
  sceneId: IPFSv2
  targetContentServer: string
  worldName: string | undefined
}

export namespace Analytics {
  export const sceneCreated = (properties?: { projectType: string; url?: string }) =>
    trackAsync('Scene created', properties)

  export const startPreview = (properties: AnalyticsProject) => trackAsync('Preview started', properties)

  export const sceneStartDeploy = (properties?: any) => trackAsync('Scene deploy started', properties)

  export const sceneDeploySuccess = (properties: SceneDeploySuccess) => trackAsync('Scene deploy success', properties)

  export const worldAcl = (properties: any) => trackAsync('World ACL', properties)

  export const buildScene = (properties: AnalyticsProject) => trackAsync('Build scene', properties)

  export const infoCmd = (properties?: any) => trackAsync('Info command', properties)
  export const statusCmd = (properties?: any) => trackAsync('Status command', properties)
  export const sendData = (shareData: boolean) => trackAsync(ANONYMOUS_DATA_QUESTION, { shareData })
  export const tryToUseDeprecated = (properties?: any) => trackAsync('Try to use depacreated feature', properties)

  export async function identify(devId: string) {
    analytics.identify({
      userId: SINGLEUSER,
      traits: {
        os: process.platform,
        createdAt: new Date().getTime(),
        isCI: isCI(),
        isEditor: isEditor(),
        devId
      }
    })
  }

  export async function reportError(type: string, message: string, stackTrace: string) {
    return track('Error', {
      errorType: type,
      message,
      stackTrace
    })
  }

  export async function requestPermission() {
    const { fileExists, segmentKey } = getConfig()
    if (!segmentKey) return
    analytics = new AnalyticsNode(segmentKey)
    if (!fileExists) {
      console.log(
        chalk.dim(
          `Decentraland CLI sends anonymous usage stats to improve their products, if you want to disable it change the configuration at ${chalk.bold(
            '~/.dclinfo'
          )}\n`
        )
      )

      const newUserId = uuidv4()
      await createDCLInfo({ userId: newUserId, trackStats: true })
      debug(`${chalk.bold('.dclinfo')} file created`)
      await identify(newUserId)
      sendData(true)
    }
  }
}

/**
 * Tracks an specific event using the Segment API
 * @param eventName The name of the event to be tracked
 * @param properties Any object containing serializable data
 */
async function track(eventName: string, properties: any = {}) {
  const { userId, trackStats } = getConfig()

  if (!(await isOnline())) {
    return null
  }

  return new Promise<void>(async (resolve) => {
    const newProperties = {
      ...properties,
      os: process.platform,
      nodeVersion: process.version,
      cliVersion: getInstalledCLIVersion(),
      isCI: isCI(),
      isEditor: isEditor(),
      devId: userId
    }

    const shouldTrack = trackStats || eventName === ANONYMOUS_DATA_QUESTION
    if (!shouldTrack) {
      resolve()
    }

    const event = {
      userId: SINGLEUSER,
      event: eventName,
      properties: newProperties
    }

    try {
      analytics.track(event, () => {
        resolve()
      })
    } catch (e) {
      resolve()
    }
  })
}

const pendingTracking: Promise<any>[] = []

function trackAsync(eventName: string, properties: any = {}) {
  const pTracking = track(eventName, properties).then().catch(debug)
  pendingTracking.push(pTracking)
}

export async function finishPendingTracking() {
  return Promise.all(pendingTracking)
}
