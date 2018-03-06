declare module 'decentraland-commons' {
  namespace env {
    export function load(): void;
    export function get(name: string, fallback?: () => any): string;
  }
}
