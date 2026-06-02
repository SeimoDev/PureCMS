declare module 'node:fs' {
  export type Dirent = {
    name: string
    isDirectory(): boolean
    isFile(): boolean
  }

  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[]
  export function readFileSync(path: string, encoding: 'utf8'): string
}

declare module 'node:path' {
  export function dirname(path: string): string
  export function join(...paths: string[]): string
  export function relative(from: string, to: string): string
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
