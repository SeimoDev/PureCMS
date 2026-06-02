import { readFileSync } from 'node:fs'

function assertIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`)
  }
}

function assertExcludes(source: string, unexpected: string, label: string) {
  if (source.includes(unexpected)) {
    throw new Error(`${label}: found ${unexpected}`)
  }
}

const source = readFileSync('src/pages/PostsManagerPage.tsx', 'utf8')

assertExcludes(source, 'window.confirm', 'posts manager should use in-app confirmation dialogs')
assertIncludes(source, '<Dialog open={Boolean(confirmDialog)}', 'posts manager confirmation dialog')
assertIncludes(source, 'commonText.destructiveAction', 'localized dialog title')
assertIncludes(source, 'commonText.cancel', 'localized cancel action')
assertIncludes(source, 'confirmDialog?.confirmLabel', 'contextual confirm action')
