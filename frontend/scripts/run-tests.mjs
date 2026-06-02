import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const sourceDir = join(root, 'src')
const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')

function runTest(test) {
  return spawnSync(process.execPath, [tsxCli, test], { stdio: 'inherit' })
}

function collectTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return collectTests(fullPath)
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [fullPath] : []
  })
}

const tests = collectTests(sourceDir).sort((left, right) => left.localeCompare(right))

if (tests.length === 0) {
  console.log('No frontend tests found.')
  process.exit(0)
}

for (const test of tests) {
  const label = relative(root, test)
  console.log(`Running ${label}`)
  const result = runTest(test)
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`Ran ${tests.length} frontend tests.`)
