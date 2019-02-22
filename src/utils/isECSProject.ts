export default function isECSProject(pkg): boolean {
  return Object.keys(pkg.devDependencies).some(name => name === 'decentraland-ecs')
}
