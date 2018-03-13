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

///
/// List of tracked events
///

export const sceneCreated = track('Scene created');
export const preview = track('Preview started');
export const sceneUploadRequested = track('Scene upload started');
export const sceneUploaded = track('Scene uploaded');
export const sceneLink = track('Scene ethereum link started');
export const sceneLinked = track('Scene ethereum linked');
export const deploy = track('Scene deploy requested');
export async function postInstall() {
  const userId = await getUserId();
  analytics.identify({
    userId,
    traits: {
      os: process.platform,
      createdAt: new Date().getTime()
    }
  });
}

///
/// Helper "track" function
///

export function track(eventName: string) {
  return async () => {
    // No reporting if running under development mode
    if (isDev) {
      return;
    }
    const userId = await getUserId();
    analytics.track({
      userId,
      event: eventName,
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
