import { readFileSync } from 'node:fs'

const source = readFileSync('src/pages/PublicPostPage.tsx', 'utf8')

if (source.includes('window.prompt')) {
  throw new Error('Public post sharing should use in-page Material fallback UI instead of window.prompt')
}
