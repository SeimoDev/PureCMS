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
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const normalizedHref = href.replace(/&amp;/g, '&')
      if (!isSafeLinkUrl(normalizedHref)) return label
      return `<a href="${escapeAttribute(normalizedHref)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
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

function headingFromBlock(block: string) {
  const trimmed = block.trim()
  const match = trimmed.match(/^(#{1,3})\s+(.+)$/)
  if (!match || match[2].includes('\n')) return null
  return {
    level: match[1].length,
    text: match[2].trim(),
  }
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
    .filter((heading): heading is NonNullable<typeof heading> => Boolean(heading))
    .map((heading) => {
      const text = plainInlineText(heading.text)
      return {
        id: uniqueHeadingId(text, counts),
        level: heading.level as 1 | 2 | 3,
        text,
      }
    })
}

export function splitMarkdownBlocks(content: string) {
  const blocks: string[] = []
  const current: string[] = []
  let inFence = false

  content.split(/\r?\n/).forEach((line) => {
    if (line.trim().startsWith('```')) {
      current.push(line)
      if (inFence) {
        blocks.push(current.join('\n'))
        current.length = 0
        inFence = false
      } else {
        inFence = true
      }
      return
    }

    if (inFence) {
      current.push(line)
      return
    }

    if (line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current.length = 0
      }
      return
    }

    current.push(line)
  })

  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks
}

export function markdownBlockToHtml(block: string) {
  return markdownBlockToHtmlWithHeadingId(block)
}

function markdownBlockToHtmlWithHeadingId(block: string, headingId?: string) {
  const trimmed = block.trim()
  const code = trimmed.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)\n?```$/)
  if (code) {
    const language = code[1] ? ` class="language-${escapeAttribute(code[1])}"` : ''
    return `<pre><code${language}>${escapeHtml(code[2])}</code></pre>`
  }

  const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
  if (image) {
    const alt = inlineMarkup(image[1].trim())
    const rawSrc = image[2].trim()
    if (!isSafeImageUrl(rawSrc)) return `<p>${inlineMarkup(trimmed)}</p>`
    const src = escapeAttribute(rawSrc)
    const caption = alt ? `<figcaption>${alt}</figcaption>` : ''
    return `<figure><img src="${src}" alt="${escapeAttribute(image[1].trim())}" loading="lazy" />${caption}</figure>`
  }

  const lines = block.split(/\r?\n/).map((line) => line.trimEnd())
  if (lines.length > 1 && lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return `<ul>${lines.map((line) => `<li>${inlineMarkup(listItemText(line))}</li>`).join('')}</ul>`
  }
  if (lines.length > 1 && lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
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
  if (lines.every((line) => line.startsWith('> '))) {
    return `<blockquote>${lines.map((line) => inlineMarkup(line.slice(2))).join('<br />')}</blockquote>`
  }
  return `<p>${inlineMarkup(trimmed).replace(/\n/g, '<br />')}</p>`
}

export function markdownToHtml(content: string) {
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
