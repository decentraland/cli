import * as path from 'path';

import * as uuidv4 from 'uuid/v4';

import { cliPath } from './cli-path';

const Analytics = require('analytics-node');

import { ensureFolder, pathExists, readFile, writeFile } from './filesystem';
import { isDev } from './is-dev';

///
/// Setup segment.io
///

const WRITE_KEY = 'sFdziRVDJo0taOnGzTZwafEL9nLIANZ3';
export const analytics = new Analytics(WRITE_KEY);
const SINGLEUSER = 'cli-user';

///
/// List of tracked events
///

export const sceneCreated = track('Scene created');
export const preview = track('Preview started');
export const sceneUpload = track('Scene upload started');
export const sceneUploadSuccess = track('Scene upload success');
export const sceneLink = track('Scene ethereum link started');
export const sceneLinkSuccess = track('Scene ethereum link succeeded');
export const deploy = track('Scene deploy requested');

export async function postInstall() {
  const userId = await getUserId();
  analytics.identify({
    SINGLEUSER,
    traits: {
      os: process.platform,
      createdAt: new Date().getTime(),
      userId,
    }
  });
}

///
/// Helper "track" function
///

export function track(eventName: string) {
  return async (properties = {}) => {
    // No reporting if running under development mode
    if (isDev) {
      return;
    }
    const userId = await getUserId();
    analytics.track({
      userId: SINGLEUSER,
      event: eventName,
      properties: {
        ...properties,
        os: process.platform,
        userId
      }
    });
  };
}

/**
 * Store a user id in the decentraland node module package
 */
async function getUserId() {
  const homeDecentraland = cliPath;
  await ensureFolder(homeDecentraland);

  const userIdFile = path.join(homeDecentraland, 'userId');
  const userIdFileExists = await pathExists(userIdFile);
  let userId;
  if (await pathExists(userIdFile)) {
    userId = (await readFile(userIdFile)).toString();
  } else {
    userId = uuidv4();
    await writeFile(userIdFile, userId);
  }
  return userId;
}
