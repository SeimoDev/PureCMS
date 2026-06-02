import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = dirname(fileURLToPath(import.meta.url))
const hanCharacterPattern = /[\u3400-\u9FFF]/

function collectFiles(dir: string, predicate: (path: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(fullPath, predicate)
    return entry.isFile() && predicate(fullPath) ? [fullPath] : []
  })
}

function firstHanLine(path: string) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  const index = lines.findIndex((line) => hanCharacterPattern.test(line))
  if (index < 0) return ''
  return `${relative(sourceRoot, path)}:${index + 1}: ${lines[index].trim()}`
}

const renderedSources = collectFiles(sourceRoot, (path) => path.endsWith('.tsx'))
const sharedUISources = ['api/client.ts', 'appearance.ts'].map((path) => join(sourceRoot, path))

const violations = [...renderedSources, ...sharedUISources].map(firstHanLine).filter(Boolean)

if (violations.length > 0) {
  throw new Error(`Non-i18n UI source contains Chinese text:\n${violations.join('\n')}`)
}
