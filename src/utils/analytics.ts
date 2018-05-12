import * as uuidv4 from 'uuid/v4'
import { isDev } from './env'
import inquirer = require('inquirer')
import { getDCLInfo, writeDCLInfo } from './dclinfo'
import { isOnline } from './moduleHelpers'
const AnalyticsNode = require('analytics-node')

// Setup segment.io
const WRITE_KEY = 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
const SINGLEUSER = 'cli-user'
export const analytics = new AnalyticsNode(WRITE_KEY)

export namespace Analytics {
  export const sceneCreated = (properties?: any) => track('Scene created', properties)
  export const preview = (properties?: any) => track('Preview started', properties)
  export const sceneDeploy = (properties?: any) => track('Scene deploy started', properties)
  export const sceneDeploySuccess = (properties?: any) => track('Scene deploy success', properties)
  export const sceneLink = (properties?: any) => track('Scene ethereum link started', properties)
  export const sceneLinkSuccess = (properties?: any) => track('Scene ethereum link succeeded', properties)
  export const deploy = (properties?: any) => track('Scene deploy requested', properties)
  export const pinRequest = (properties?: any) => track('Pin requested', properties)
  export const pinSuccess = (properties?: any) => track('Pin success', properties)

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
    let devId = dclinfo ? dclinfo.userId : null
    let shouldTrack = dclinfo ? dclinfo.trackStats : true

    if (!dclinfo) {
      const results = await inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        default: true,
        message: 'Send anonymous usage stats to Decentraland?'
      })

      devId = uuidv4()
      await writeDCLInfo(devId, results.continue)
      await Analytics.identify(devId)
      shouldTrack = results.continue

      if (!results.continue) {
        resolve()
      }
    }

    const event = {
      userId: SINGLEUSER,
      event: eventName,
      properties: {
        ...properties,
        os: process.platform,
        devId
      }
    }

    if (shouldTrack) {
      analytics.track(event, (err, batch) => {
        if (err) {
          reject()
        }
        resolve()
      })
    } else {
      resolve()
    }
  })
}
