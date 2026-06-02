import { createCmsTheme } from './theme.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const theme = createCmsTheme()
const baseline = theme.components?.MuiCssBaseline?.styleOverrides as unknown as
  | Record<string, Record<string, unknown>>
  | undefined
const body = baseline?.body
const selectableTextSelector =
  'input, textarea, [contenteditable="true"], .MuiInputBase-input, .article-content, .article-content *, .user-content, .user-content *, pre, code'
const selectableText =
  baseline?.[selectableTextSelector]

if (!body || !selectableText) {
  throw new Error('selection style overrides should exist')
}

assertEqual(String(body.userSelect), 'none', 'ui text is not selectable by default')
assertEqual(String(body.WebkitUserSelect), 'none', 'webkit ui text is not selectable by default')
assertEqual(String(selectableText.userSelect), 'text', 'article, user content, and editable text remains selectable')
assertEqual(String(selectableText.WebkitUserSelect), 'text', 'webkit article, user content, and editable text remains selectable')
