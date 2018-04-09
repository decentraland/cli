declare module 'decentraland-commons/dist/env' {
  namespace env {
    export function load(): void
    export function get(name: string, fallback?: () => any): string
  }
}
