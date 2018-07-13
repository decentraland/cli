import * as uuidv4 from 'uuid/v4'
import { isDev } from './env'
import inquirer = require('inquirer')
import { getDCLInfo, writeDCLInfo } from './dclinfo'
import { isOnline } from './moduleHelpers'
const AnalyticsNode = require('analytics-node')

// Setup segment.io
const WRITE_KEY = 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3'
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
  export const sendData = (properties?: any) => track('Send Anonymous data', properties)


  export async function identify(devId: string) {
    analytics.identify({
      userId: devId,
      traits: {
        os: process.platform,
        createdAt: new Date().getTime()
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
    let devId = dclinfo ? dclinfo.userId : null
    let shouldTrack = dclinfo ? dclinfo.trackStats : true

    const event = {
      userId: devId,
      event: eventName,
      properties: {
        ...properties,
        os: process.platform,
        ci: process.env.CI
      }
    }

    if (shouldTrack) {
      try {
        analytics.track(event, () => {
          resolve()
        })
      } catch (e) {
        resolve()
      }
    } else {
      resolve()
    }
  })
}
