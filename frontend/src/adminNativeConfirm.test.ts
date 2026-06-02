import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return collectTsxFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [fullPath] : []
  })
}

for (const filePath of collectTsxFiles('src/pages')) {
  const source = readFileSync(filePath, 'utf8')
  if (source.includes('window.confirm')) {
    throw new Error(`${relative('src', filePath)} should use AdminConfirmDialog instead of window.confirm`)
  }
}
