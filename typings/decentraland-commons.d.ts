declare module 'decentraland-commons' {
  module env {
    export function load(): void
    export function get(name: string, fallback?: () => any): string
  }
}
