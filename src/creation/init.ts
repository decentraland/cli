import fs = require('fs-extra');
import * as uuid from 'uuid';
import path = require('path');

import * as project from '../utils/project';
import { ensureFolder } from '../utils/filesystem';
import { cliPath } from '../utils/cli-path';
import { getRoot } from '../utils/get-root';
import { sceneCreated } from '../utils/analytics';

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

interface GeneratorSettings {
  withSampleScene?: boolean;
}

export async function generateHtml({ withSampleScene = false }: GeneratorSettings): Promise<string> {
  const sampleScene = `
    <a-box position="5 0.5 5" rotation="0 45 0" color="#4CC3D9"></a-box>
    <a-sphere position="6 1.25 4" radius="1.25" color="#EF2D5E"></a-sphere>
    <a-cylinder position="7 0.75 3" radius="0.5" height="1.5" color="#FFC65D"></a-cylinder>
    <a-plane position="5 0 6" rotation="-90 0 0" width="4" height="4" color="#7BC8A4"></a-plane>`;

  const html = `<a-scene>
  ${withSampleScene ? sampleScene : '<!-- Your scene code -->'}
</a-scene>`;
  return html;
}

export async function buildHtml(pathToProject: string, withSampleScene: boolean): Promise<void> {
  const html = await generateHtml({ withSampleScene });
  await fs.outputFile(path.join(pathToProject, 'scene.html'), html);
}
