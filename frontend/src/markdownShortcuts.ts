export type MarkdownShortcut = 'bold' | 'h2' | 'quote' | 'ul' | 'ol' | 'link' | 'code' | 'table'

export type MarkdownEditResult = {
  content: string
  selectionStart: number
  selectionEnd: number
}

export type MarkdownShortcutTemplates = {
  linePlaceholder: string
  boldPlaceholder: string
  linkPlaceholder: string
  codePlaceholder: string
  tableTemplate: string
}

export const defaultMarkdownShortcutTemplates: MarkdownShortcutTemplates = {
  linePlaceholder: '内容',
  boldPlaceholder: '重点文字',
  linkPlaceholder: '链接文字',
  codePlaceholder: 'code',
  tableTemplate: '| 列名 | 说明 |\n| --- | --- |\n| 示例 | 内容 |',
}

export function insertMarkdownBlock(content: string, block: string) {
  const prefix = content.trimEnd()
  return `${prefix}${prefix ? '\n\n' : ''}${block}\n`
}

function insertMarkdownBlockAt(content: string, cursor: number, block: string): MarkdownEditResult {
  const before = content.slice(0, cursor).trimEnd()
  const after = content.slice(cursor).trimStart()
  const inserted = `${before}${before ? '\n\n' : ''}${block}\n${after ? `\n${after}` : ''}`
  const blockStart = before.length + (before ? 2 : 0)
  return {
    content: inserted,
    selectionStart: blockStart,
    selectionEnd: blockStart + block.length,
  }
}

function lineBounds(content: string, start: number, end: number) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextBreak = content.indexOf('\n', end)
  return { lineStart, lineEnd: nextBreak === -1 ? content.length : nextBreak }
}

function stripListPrefix(line: string) {
  return line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')
}

function replaceSelectedLines(
  content: string,
  start: number,
  end: number,
  transform: (line: string, index: number) => string,
  templates: MarkdownShortcutTemplates = defaultMarkdownShortcutTemplates,
): MarkdownEditResult {
  const { lineStart, lineEnd } = lineBounds(content, start, end)
  const selected = content.slice(lineStart, lineEnd) || ''
  const replacement = selected
    .split('\n')
    .map((line, index) => transform(line || templates.linePlaceholder, index))
    .join('\n')
  return {
    content: `${content.slice(0, lineStart)}${replacement}${content.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  }
}

export function applyMarkdownShortcut(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  shortcut: MarkdownShortcut,
  templates: MarkdownShortcutTemplates = defaultMarkdownShortcutTemplates,
): MarkdownEditResult {
  const start = Math.max(0, Math.min(selectionStart, content.length))
  const end = Math.max(start, Math.min(selectionEnd, content.length))
  const selected = content.slice(start, end)

  if (shortcut === 'bold') {
    const label = selected || templates.boldPlaceholder
    return {
      content: `${content.slice(0, start)}**${label}**${content.slice(end)}`,
      selectionStart: start + 2,
      selectionEnd: start + 2 + label.length,
    }
  }

  if (shortcut === 'link') {
    const label = selected || templates.linkPlaceholder
    const url = 'https://example.com'
    const replacement = `[${label}](${url})`
    const urlStart = start + label.length + 3
    return {
      content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
      selectionStart: urlStart,
      selectionEnd: urlStart + url.length,
    }
  }

  if (shortcut === 'code') {
    const code = selected || templates.codePlaceholder
    const replacement = `\`\`\`\n${code}\n\`\`\``
    return {
      content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
      selectionStart: start + 4,
      selectionEnd: start + 4 + code.length,
    }
  }

  if (shortcut === 'table') {
    return insertMarkdownBlockAt(content, start, templates.tableTemplate)
  }

  if (shortcut === 'h2') {
    return replaceSelectedLines(content, start, end, (line) => `## ${line.replace(/^#{1,6}\s+/, '')}`, templates)
  }

  if (shortcut === 'quote') {
    return replaceSelectedLines(content, start, end, (line) => `> ${line.replace(/^>\s?/, '')}`, templates)
  }

  if (shortcut === 'ul') {
    return replaceSelectedLines(content, start, end, (line) => `- ${stripListPrefix(line)}`, templates)
  }

  return replaceSelectedLines(content, start, end, (line, index) => `${index + 1}. ${stripListPrefix(line)}`, templates)
}
