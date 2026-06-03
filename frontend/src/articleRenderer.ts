function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function urlScheme(value: string) {
  return value.trim().match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase()
}

function isSafeLinkUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  const scheme = urlScheme(trimmed)
  return !scheme || scheme === 'http' || scheme === 'https' || scheme === 'mailto'
}

function isSafeImageUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('//')) return false
  const scheme = urlScheme(trimmed)
  return !scheme || scheme === 'http' || scheme === 'https'
}

function inlineMarkup(line: string) {
  return escapeHtml(line)
    .replace(/\[([^\]]+)\]\(([^)\n]+)\)/g, (_, label: string, href: string) => {
      const normalizedHref = href.replace(/&amp;/g, '&')
      if (!isSafeLinkUrl(normalizedHref)) return label
      return `<a href="${escapeAttribute(normalizedHref)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function listItemText(line: string) {
  return line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

type MarkdownHeading = {
  level: number
  text: string
}

function headingFromBlock(block: string): MarkdownHeading | null {
  const trimmed = block.trim()
  const match = trimmed.match(/^(#{1,6})\s+(.+)$/)
  if (!match || match[2].includes('\n')) return null
  return {
    level: match[1].length,
    text: match[2].trim(),
  }
}

function isTocHeading(heading: MarkdownHeading | null): heading is MarkdownHeading & { level: 1 | 2 | 3 } {
  return heading !== null && heading.level >= 1 && heading.level <= 3
}

function plainInlineText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function baseHeadingId(text: string) {
  const normalized = plainInlineText(text)
    .toLocaleLowerCase()
    .replace(/&[a-z0-9#]+;/gi, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || 'section'
}

function uniqueHeadingId(text: string, counts: Map<string, number>) {
  const base = baseHeadingId(text)
  const count = (counts.get(base) ?? 0) + 1
  counts.set(base, count)
  return count === 1 ? base : `${base}-${count}`
}

export type ArticleHeading = {
  id: string
  level: 1 | 2 | 3
  text: string
}

export function extractArticleHeadings(content: string): ArticleHeading[] {
  const counts = new Map<string, number>()
  return splitMarkdownBlocks(content)
    .map(headingFromBlock)
    .filter(isTocHeading)
    .map((heading) => {
      const text = plainInlineText(heading.text)
      return {
        id: uniqueHeadingId(text, counts),
        level: heading.level as 1 | 2 | 3,
        text,
      }
    })
}

function isFenceLine(line: string) {
  return line.trim().startsWith('```')
}

function isBlankLine(line: string) {
  return line.trim() === ''
}

function isUnorderedListItem(line: string) {
  return /^\s*[-*]\s+/.test(line)
}

function isOrderedListItem(line: string) {
  return /^\s*\d+[.)]\s+/.test(line)
}

function isListItem(line: string) {
  return isUnorderedListItem(line) || isOrderedListItem(line)
}

function isBlockquoteLine(line: string) {
  return /^\s*>\s?/.test(line)
}

function isHeadingLine(line: string) {
  return Boolean(headingFromBlock(line))
}

function isHorizontalRuleLine(line: string) {
  return /^[-*_]{3,}$/.test(line.trim())
}

function normalizeMarkdownDestination(value: string) {
  let target = value.trim()
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim()
  }
  const titleMatch = target.match(/^(\S+)\s+(['"]).*\2$/)
  if (titleMatch) return titleMatch[1]
  return target
}

function parseMarkdownImageBlock(block: string) {
  const trimmed = block.trim()
  if (!trimmed.startsWith('![') || !trimmed.endsWith(')')) return null
  const labelEnd = trimmed.indexOf('](', 2)
  if (labelEnd < 0) return null
  const alt = trimmed.slice(2, labelEnd)
  const src = normalizeMarkdownDestination(trimmed.slice(labelEnd + 2, -1))
  if (!src) return null
  return { alt, src }
}

function isImageLine(line: string) {
  return Boolean(parseMarkdownImageBlock(line))
}

function startsTable(lines: string[], index: number) {
  return index + 1 < lines.length && lines[index].includes('|') && isTableSeparator(lines[index + 1])
}

function startsSpecialBlock(lines: string[], index: number) {
  const line = lines[index]
  return (
    isFenceLine(line) ||
    startsTable(lines, index) ||
    isBlockquoteLine(line) ||
    isListItem(line) ||
    isHeadingLine(line) ||
    isHorizontalRuleLine(line) ||
    isImageLine(line)
  )
}

export function splitMarkdownBlocks(content: string): string[] {
  const blocks: string[] = []
  const paragraph: string[] = []
  const lines = content.split(/\r?\n/)

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push(paragraph.join('\n'))
    paragraph.length = 0
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (isBlankLine(line)) {
      flushParagraph()
      continue
    }

    if (isFenceLine(line)) {
      flushParagraph()
      const fence = [line]
      index += 1
      while (index < lines.length) {
        fence.push(lines[index])
        if (isFenceLine(lines[index])) break
        index += 1
      }
      blocks.push(fence.join('\n'))
      continue
    }

    if (startsTable(lines, index)) {
      flushParagraph()
      const table = [line]
      index += 1
      while (index < lines.length && !isBlankLine(lines[index]) && lines[index].includes('|')) {
        table.push(lines[index])
        index += 1
      }
      index -= 1
      blocks.push(table.join('\n'))
      continue
    }

    if (isBlockquoteLine(line)) {
      flushParagraph()
      const quote = [line]
      index += 1
      while (index < lines.length && (isBlockquoteLine(lines[index]) || isBlankLine(lines[index]))) {
        quote.push(lines[index])
        index += 1
      }
      index -= 1
      blocks.push(quote.join('\n'))
      continue
    }

    if (isListItem(line)) {
      flushParagraph()
      const ordered = isOrderedListItem(line)
      const list = [line]
      index += 1
      while (index < lines.length && !isBlankLine(lines[index]) && (ordered ? isOrderedListItem(lines[index]) : isUnorderedListItem(lines[index]))) {
        list.push(lines[index])
        index += 1
      }
      index -= 1
      blocks.push(list.join('\n'))
      continue
    }

    if (isHeadingLine(line) || isHorizontalRuleLine(line) || isImageLine(line)) {
      flushParagraph()
      blocks.push(line)
      continue
    }

    if (paragraph.length > 0 && startsSpecialBlock(lines, index)) {
      flushParagraph()
    }
    paragraph.push(line)
  }

  flushParagraph()
  return blocks
}

export function markdownBlockToHtml(block: string): string {
  return markdownBlockToHtmlWithHeadingId(block)
}

function markdownBlockToHtmlWithHeadingId(block: string, headingId?: string): string {
  const trimmed = block.trim()
  const code = trimmed.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)\n?```$/)
  if (code) {
    const language = code[1] ? ` class="language-${escapeAttribute(code[1])}"` : ''
    return `<pre><code${language}>${escapeHtml(code[2])}</code></pre>`
  }

  const image = parseMarkdownImageBlock(trimmed)
  if (image) {
    const alt = inlineMarkup(image.alt.trim())
    const rawSrc = image.src.trim()
    if (!isSafeImageUrl(rawSrc)) return `<p>${inlineMarkup(trimmed)}</p>`
    const src = escapeAttribute(rawSrc)
    const caption = alt ? `<figcaption>${alt}</figcaption>` : ''
    return `<figure><img src="${src}" alt="${escapeAttribute(image.alt.trim())}" loading="lazy" />${caption}</figure>`
  }

  const lines = block.split(/\r?\n/).map((line) => line.trimEnd())
  if (lines.length > 0 && lines.every(isUnorderedListItem)) {
    return `<ul>${lines.map((line) => `<li>${inlineMarkup(listItemText(line))}</li>`).join('')}</ul>`
  }
  if (lines.length > 0 && lines.every(isOrderedListItem)) {
    return `<ol>${lines.map((line) => `<li>${inlineMarkup(listItemText(line))}</li>`).join('')}</ol>`
  }
  if (lines.length >= 3 && lines.every((line) => line.includes('|')) && isTableSeparator(lines[1])) {
    const headers = tableCells(lines[0])
    const rows = lines.slice(2).map(tableCells).filter((row) => row.length === headers.length)
    return `<table><thead><tr>${headers.map((cell) => `<th>${inlineMarkup(cell)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkup(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`
  }

  const heading = headingFromBlock(trimmed)
  if (heading) {
    const id = escapeAttribute(headingId ?? baseHeadingId(heading.text))
    return `<h${heading.level} id="${id}">${inlineMarkup(heading.text)}</h${heading.level}>`
  }
  if (/^[-*_]{3,}$/.test(trimmed)) return '<hr />'
  if (lines.every((line) => isBlockquoteLine(line) || isBlankLine(line))) {
    const quoteContent = lines.map((line) => line.replace(/^\s*>\s?/, '')).join('\n').trim()
    return `<blockquote>${quoteContent ? markdownToHtml(quoteContent) : ''}</blockquote>`
  }
  return `<p>${inlineMarkup(trimmed).replace(/\n/g, '<br />')}</p>`
}

export function markdownToHtml(content: string): string {
  const headings = extractArticleHeadings(content)
  let headingIndex = 0
  return splitMarkdownBlocks(content)
    .map((block) => {
      if (headingFromBlock(block)) {
        const heading = headings[headingIndex]
        headingIndex += 1
        return markdownBlockToHtmlWithHeadingId(block, heading?.id)
      }
      return markdownBlockToHtmlWithHeadingId(block)
    })
    .join('')
}
