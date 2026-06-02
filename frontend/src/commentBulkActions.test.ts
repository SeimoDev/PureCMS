import {
  countSelectedCommentsInPage,
  toggleCommentPageSelection,
  toggleCommentSelection,
} from './commentBulkActions.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

function assertArray(actual: string[], expected: string[], label: string) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label)
}

assertArray(toggleCommentSelection([], 'comment-1'), ['comment-1'], 'selects a comment')
assertArray(toggleCommentSelection(['comment-1'], 'comment-1'), [], 'unselects a comment')
assertArray(toggleCommentSelection(['comment-1'], 'comment-2'), ['comment-1', 'comment-2'], 'keeps existing selection order')

assertArray(
  toggleCommentPageSelection(['comment-3'], ['comment-1', 'comment-2'], true),
  ['comment-3', 'comment-1', 'comment-2'],
  'selects current page without clearing other pages',
)
assertArray(
  toggleCommentPageSelection(['comment-1', 'comment-2', 'comment-3'], ['comment-1', 'comment-2'], false),
  ['comment-3'],
  'clears only current page selection',
)
assertArray(
  toggleCommentPageSelection(['comment-1'], ['comment-1', 'comment-1', 'comment-2'], true),
  ['comment-1', 'comment-2'],
  'deduplicates repeated page ids',
)

assertEqual(String(countSelectedCommentsInPage(['comment-1', 'comment-4'], ['comment-1', 'comment-2'])), '1', 'counts current page selection')
