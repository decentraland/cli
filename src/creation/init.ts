import fs = require('fs-extra');
import * as uuid from 'uuid';
import path = require('path');

import * as project from '../utils/project';
import { ensureFolder } from '../utils/filesystem';
import { cliPath } from '../utils/cli-path';
import { getRoot } from '../utils/get-root';
import { sceneCreated } from '../utils/analytics';

interface GeneratorSettings {
  withSampleScene?: boolean;
}

export enum BoilerplateType {
  STATIC = 'static',
  TYPESCRIPT = 'ts',
  WEBSOCKETS = 'ws'
}

export async function initProject(args: any, sceneMeta: any) {
  const dirName = args.options.path || getRoot();
  fs.outputFileSync(
    path.join(dirName, '.decentraland', 'project.json'),
    JSON.stringify(
      {
        id: uuid.v4(),
        ipfsKey: null
      },
      null,
      2
    )
  );

  // Project folders
  const ensureLocal = async (folder: string) => await ensureFolder([dirName, folder]);
  await ensureLocal(path.join(dirName, 'audio'));
  await ensureLocal(path.join(dirName, 'models'));
  await ensureLocal(path.join(dirName, 'textures'));
  sceneCreated();

  fs.outputFileSync(path.join(dirName, 'scene.json'), JSON.stringify(sceneMeta, null, 2));
}

export function isValidBoilerplateType(boilerplateType: string): boolean {
  for (let type in BoilerplateType) {
    if (boilerplateType === type) {
      return true;
    }
  }
  return false;
}

export function scaffoldWebsockets(server: string) {
  overwriteSceneFile({ main: server }, process.cwd());
}

export function overwriteSceneFile(scene: any, destination: string) {
  const outPath = path.join(destination, 'scene.json');
  const currentSceneFile = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  fs.outputFileSync(outPath, JSON.stringify({ ...currentSceneFile, ...scene }, null, 2));
}

export function copySample(project: string, destination: string = process.cwd()) {
  const src = path.resolve(__dirname, '..', 'samples', project);
  const files = fs.readdirSync(src);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === 'scene.json') {
      const sampleSceneFile = JSON.parse(fs.readFileSync(path.join(src, 'scene.json'), 'utf-8'));
      overwriteSceneFile(sampleSceneFile, destination);
    } else {
      fs.copyFileSync(path.join(src, file), path.join(destination, file));
    }
  }
}