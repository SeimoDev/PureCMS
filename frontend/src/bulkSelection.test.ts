import { countSelectedInPage, togglePageSelection, toggleSelection } from './bulkSelection.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

function assertArray(actual: string[], expected: string[], label: string) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label)
}

assertArray(toggleSelection([], 'post-1'), ['post-1'], 'selects an item')
assertArray(toggleSelection(['post-1'], 'post-1'), [], 'unselects an item')
assertArray(toggleSelection(['post-1'], 'post-2'), ['post-1', 'post-2'], 'keeps selection order')
assertArray(toggleSelection(['post-1'], ''), ['post-1'], 'ignores empty ids')

assertArray(
  togglePageSelection(['post-3'], ['post-1', 'post-2'], true),
  ['post-3', 'post-1', 'post-2'],
  'selects current page while preserving other pages',
)
assertArray(
  togglePageSelection(['post-1', 'post-2', 'post-3'], ['post-1', 'post-2'], false),
  ['post-3'],
  'clears only current page',
)
assertArray(
  togglePageSelection(['post-1'], ['post-1', 'post-1', 'post-2'], true),
  ['post-1', 'post-2'],
  'deduplicates selected ids',
)

assertEqual(String(countSelectedInPage(['post-1', 'post-4'], ['post-1', 'post-2'])), '1', 'counts selected ids in current page')
