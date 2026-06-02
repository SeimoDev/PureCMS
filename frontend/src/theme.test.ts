import { createCmsTheme } from './theme.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const theme = createCmsTheme()
const darkTheme = createCmsTheme({ themeMode: 'dark' })
const cssBaseline = theme.components?.MuiCssBaseline?.styleOverrides as Record<string, Record<string, unknown>> | undefined
const buttonRoot = theme.components?.MuiButton?.styleOverrides?.root as Record<string, unknown> | undefined
const toggleButtonRoot = theme.components?.MuiToggleButton?.styleOverrides?.root as Record<string, unknown> | undefined
const tabRoot = theme.components?.MuiTab?.styleOverrides?.root as Record<string, unknown> | undefined
const chipLabel = theme.components?.MuiChip?.styleOverrides?.label as Record<string, unknown> | undefined
const menuItemRoot = theme.components?.MuiMenuItem?.styleOverrides?.root as Record<string, unknown> | undefined
const listItemPrimary = theme.components?.MuiListItemText?.styleOverrides?.primary as Record<string, unknown> | undefined

if (!cssBaseline || !buttonRoot || !toggleButtonRoot || !tabRoot || !chipLabel || !menuItemRoot || !listItemPrimary) {
  throw new Error('common UI text wrapping overrides should exist')
}

assertEqual(String(cssBaseline.body.userSelect), 'none', 'UI text is not selectable by default')
assertEqual(String(cssBaseline.body.WebkitUserSelect), 'none', 'UI text is not selectable by default in WebKit')
const selectableContentSelector =
  'input, textarea, [contenteditable="true"], .MuiInputBase-input, .article-content, .article-content *, .user-content, .user-content *, pre, code'
const selectableContent = cssBaseline[selectableContentSelector]
if (!selectableContent) {
  throw new Error('article, user content, code, and editable text should stay selectable')
}
assertEqual(String(selectableContent.userSelect), 'text', 'content and editable text stay selectable')
assertEqual(String(selectableContent.WebkitUserSelect), 'text', 'content and editable text stay selectable in WebKit')
assertEqual(String(buttonRoot.whiteSpace), 'nowrap', 'buttons keep labels on one line')
assertEqual(String(buttonRoot.minWidth), 'max-content', 'buttons keep enough intrinsic width for labels')
assertEqual(String(toggleButtonRoot.whiteSpace), 'nowrap', 'toggle buttons keep labels on one line')
assertEqual(String(tabRoot.whiteSpace), 'nowrap', 'tabs keep labels on one line')
assertEqual(String(chipLabel.whiteSpace), 'nowrap', 'chips keep labels on one line')
assertEqual(String(chipLabel.textOverflow), 'ellipsis', 'long chip labels are clipped cleanly')
assertEqual(String(menuItemRoot.whiteSpace), 'nowrap', 'menu items keep labels on one line')
assertEqual(String(listItemPrimary.whiteSpace), 'nowrap', 'navigation text keeps labels on one line')
assertEqual(String(listItemPrimary.textOverflow), 'ellipsis', 'long navigation labels are clipped cleanly')
assertEqual(theme.palette.primary.container, '#D7F2E5', 'light primary container token exists')
assertEqual(theme.palette.primary.onContainer, '#062018', 'light primary on-container token exists')
assertEqual(darkTheme.palette.primary.container, '#0B4F3D', 'dark primary container token exists')
assertEqual(darkTheme.palette.primary.onContainer, '#B8E9D1', 'dark primary on-container token exists')
