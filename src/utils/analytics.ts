import * as uuidv4 from 'uuid/v4'
import * as inquirer from 'inquirer'
import AnalyticsNode = require('analytics-node')

import { isDev } from './env'
import { getDCLInfo, writeDCLInfo } from './dclinfo'
import { isOnline, getInstalledCLIVersion, getInstalledVersion } from './moduleHelpers'

// Setup segment.io
const WRITE_KEY = 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
const SINGLEUSER = 'cli-user'
export const analytics = new AnalyticsNode(WRITE_KEY)

const ANONYMOUS_DATA_QUESTION = 'Send Anonymous data'

export namespace Analytics {
  export const sceneCreated = (properties?: any) => trackAsync('Scene created', properties)
  export const preview = (properties?: any) => trackAsync('Preview started', properties)
  export const sceneDeploy = (properties?: any) => trackAsync('Scene deploy started', properties)
  export const sceneDeploySuccess = (properties?: any) => trackAsync('Scene deploy success', properties)
  export const sceneLink = (properties?: any) => trackAsync('Scene ethereum link started', properties)
  export const sceneLinkSuccess = (properties?: any) => trackAsync('Scene ethereum link succeeded', properties)
  export const deploy = (properties?: any) => trackAsync('Scene deploy requested', properties)
  export const pinRequest = (properties?: any) => trackAsync('Pin requested', properties)
  export const pinSuccess = (properties?: any) => trackAsync('Pin success', properties)
  export const infoCmd = (properties?: any) => trackAsync('Info command', properties)
  export const statusCmd = (properties?: any) => trackAsync('Status command', properties)
  export const sendData = (shareData: boolean) => trackAsync(ANONYMOUS_DATA_QUESTION, { shareData })

  export async function identify(devId: string) {
    analytics.identify({
      userId: SINGLEUSER,
      traits: {
        os: process.platform,
        createdAt: new Date().getTime(),
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
    const dclinfo = await getDCLInfo()

    if (!dclinfo) {
      const results = await inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        default: true,
        message: 'Send anonymous usage stats to Decentraland?'
      })

      const devId = uuidv4()
      await writeDCLInfo(devId, results.continue)

      if (results.continue) {
        await Analytics.identify(devId)
        await Analytics.sendData(true)
      } else {
        await Analytics.sendData(false)
      }
    }
  }
}

/**
 * Tracks an specific event using the Segment API
 * @param eventName The name of the event to be tracked
 * @param properties Any object containing serializable data
 */
async function track(eventName: string, properties: any = {}) {
  if (isDev || !(await isOnline())) {
    return
  }

  return new Promise(async (resolve, reject) => {
    const dclinfo = await getDCLInfo()
    const dclApiVersion = await getInstalledVersion('decentraland-api')
    const devId = dclinfo ? dclinfo.userId : null
    const newProperties = {
      ...properties,
      os: process.platform,
      nodeVersion: process.version,
      cliVersion: await getInstalledCLIVersion(),
      devId
    }

    let shouldTrack = dclinfo ? dclinfo.trackStats : true
    shouldTrack = shouldTrack || eventName === ANONYMOUS_DATA_QUESTION

    if (!shouldTrack) {
      resolve()
    }

    // Some commands may be running outside of a DCL project
    if (dclApiVersion) {
      newProperties.dclApiVersion = dclApiVersion
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
  const pTracking = track(eventName, properties)
    .then()
    .catch(e => {
      if (process.env.DEBUG) console.log(e)
    })
  pendingTracking.push(pTracking)
}

export async function finishPendingTracking() {
  return Promise.all(pendingTracking)
}
