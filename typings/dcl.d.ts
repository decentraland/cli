declare module '*.json' {
  export const abi: any
}

declare module 'docker-names' {
  type DockerNames = {
    getRandomName(): string
  }
  const docker: DockerNames
  export = docker
}

declare module 'wildcards' {
  const wildcards: (...args: unknown) => void
  export = wildcards
  export default wildcards
}

declare module 'opn' {
  const opn: (...args: unknown) => Promise<void>
  export = opn
  export default opn
}