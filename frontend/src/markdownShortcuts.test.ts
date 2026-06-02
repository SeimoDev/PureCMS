import { applyMarkdownShortcut, insertMarkdownBlock } from './markdownShortcuts.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

function assertSelection(actual: { selectionStart: number; selectionEnd: number }, start: number, end: number, label: string) {
  if (actual.selectionStart !== start || actual.selectionEnd !== end) {
    throw new Error(`${label}: got ${actual.selectionStart}-${actual.selectionEnd}, want ${start}-${end}`)
  }
}

assertEqual(insertMarkdownBlock('正文', '| 列名 | 说明 |'), '正文\n\n| 列名 | 说明 |\n', 'insert block after content')
assertEqual(insertMarkdownBlock('', '| 列名 | 说明 |'), '| 列名 | 说明 |\n', 'insert block into empty content')

const bold = applyMarkdownShortcut('这是重点内容', 2, 4, 'bold')
assertEqual(bold.content, '这是**重点**内容', 'bold selected text')
assertSelection(bold, 4, 6, 'bold selection')

const heading = applyMarkdownShortcut('段落', 0, 2, 'h2')
assertEqual(heading.content, '## 段落', 'heading selected line')

const quote = applyMarkdownShortcut('第一行\n第二行', 0, 6, 'quote')
assertEqual(quote.content, '> 第一行\n> 第二行', 'quote selected lines')

const unordered = applyMarkdownShortcut('第一项\n第二项', 0, 7, 'ul')
assertEqual(unordered.content, '- 第一项\n- 第二项', 'unordered list selected lines')

const ordered = applyMarkdownShortcut('第一步\n第二步', 0, 7, 'ol')
assertEqual(ordered.content, '1. 第一步\n2. 第二步', 'ordered list selected lines')

const link = applyMarkdownShortcut('官网', 0, 2, 'link')
assertEqual(link.content, '[官网](https://example.com)', 'link selected text')
assertSelection(link, 5, 24, 'link url selection')

const code = applyMarkdownShortcut('const x = 1', 0, 11, 'code')
assertEqual(code.content, '```\nconst x = 1\n```', 'code block selected text')

const table = applyMarkdownShortcut('正文', 2, 2, 'table')
assertEqual(
  table.content,
  '正文\n\n| 列名 | 说明 |\n| --- | --- |\n| 示例 | 内容 |\n',
  'table block inserted at cursor',
)

const englishTemplates = {
  linePlaceholder: 'Content',
  boldPlaceholder: 'Important text',
  linkPlaceholder: 'Link text',
  codePlaceholder: 'code',
  tableTemplate: '| Column | Notes |\n| --- | --- |\n| Example | Content |',
}

const englishBold = applyMarkdownShortcut('', 0, 0, 'bold', englishTemplates)
assertEqual(englishBold.content, '**Important text**', 'localized bold placeholder')

const englishList = applyMarkdownShortcut('', 0, 0, 'ul', englishTemplates)
assertEqual(englishList.content, '- Content', 'localized list placeholder')

const englishTable = applyMarkdownShortcut('', 0, 0, 'table', englishTemplates)
assertEqual(
  englishTable.content,
  '| Column | Notes |\n| --- | --- |\n| Example | Content |\n',
  'localized table template',
)
