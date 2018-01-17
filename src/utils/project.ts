import dockerNames = require('docker-names');

export function getDefaultName(): string  {
  return 'dcl-app';
}

export function getRandomName(): string {
  return dockerNames.getRandomName();
}
