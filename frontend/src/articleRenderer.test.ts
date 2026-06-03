import { extractArticleHeadings, markdownBlockToHtml, markdownToHtml } from './articleRenderer.js'

function assertIncludes(actual: string, expected: string, label: string) {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want to include ${JSON.stringify(expected)}`)
  }
}

function assertNotIncludes(actual: string, unexpected: string, label: string) {
  if (actual.includes(unexpected)) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want to omit ${JSON.stringify(unexpected)}`)
  }
}

const image = markdownBlockToHtml('![封面图](https://example.com/cover.png)')
assertIncludes(image, '<figure>', 'image figure')
assertIncludes(image, '<img src="https://example.com/cover.png" alt="封面图" loading="lazy" />', 'image tag')
assertIncludes(image, '<figcaption>封面图</figcaption>', 'image caption')

const relativeImage = markdownBlockToHtml('![Local cover](/uploads/cover.png)')
assertIncludes(relativeImage, '<img src="/uploads/cover.png" alt="Local cover" loading="lazy" />', 'relative image tag')

const bareRelativeImage = markdownBlockToHtml('![Bare cover](images/cover.png)')
assertIncludes(bareRelativeImage, '<img src="images/cover.png" alt="Bare cover" loading="lazy" />', 'bare relative image tag')

const mailtoImage = markdownBlockToHtml('![Mail cover](mailto:editor@example.com)')
assertNotIncludes(mailtoImage, '<img', 'mailto image blocked')
assertNotIncludes(mailtoImage, 'src="mailto:editor@example.com"', 'mailto image src blocked')

const protocolRelativeImage = markdownBlockToHtml('![CDN cover](//cdn.example.com/cover.png)')
assertNotIncludes(protocolRelativeImage, '<img', 'protocol-relative image blocked')
assertNotIncludes(protocolRelativeImage, 'src="//cdn.example.com/cover.png"', 'protocol-relative image src blocked')

const unsafeAlt = markdownBlockToHtml('![<script>](https://example.com/a.png)')
assertIncludes(unsafeAlt, 'alt="&lt;script&gt;"', 'escaped image alt')

const link = markdownBlockToHtml('阅读 [官网](https://example.com/docs?a=1&b=2) 和 [风险链接](javascript:alert(1))')
assertIncludes(link, '<a href="https://example.com/docs?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">官网</a>', 'safe link')
assertIncludes(link, '风险链接', 'unsafe link text remains')
if (link.includes('javascript:alert')) {
  throw new Error(`unsafe link href leaked: ${link}`)
}

const mailtoLink = markdownBlockToHtml('[Email us](mailto:editor@example.com)')
assertIncludes(mailtoLink, '<a href="mailto:editor@example.com" target="_blank" rel="noopener noreferrer">Email us</a>', 'mailto link remains safe')

const unorderedList = markdownBlockToHtml('- 第一项\n- **第二项**')
assertIncludes(unorderedList, '<ul>', 'unordered list')
assertIncludes(unorderedList, '<li>第一项</li>', 'unordered list item')
assertIncludes(unorderedList, '<li><strong>第二项</strong></li>', 'unordered list inline markup')

const orderedList = markdownBlockToHtml('1. 第一步\n2. 第二步')
assertIncludes(orderedList, '<ol>', 'ordered list')
assertIncludes(orderedList, '<li>第二步</li>', 'ordered list item')

const table = markdownBlockToHtml('| 功能 | 状态 |\n| --- | --- |\n| Markdown 表格 | 已支持 |')
assertIncludes(table, '<table>', 'table')
assertIncludes(table, '<th>功能</th>', 'table heading')
assertIncludes(table, '<td>已支持</td>', 'table cell')

const code = markdownToHtml('```html\n<div>危险</div>\n\n<script>alert(1)</script>\n```')
assertIncludes(code, '<pre><code class="language-html">', 'code language class')
assertIncludes(code, '&lt;div&gt;危险&lt;/div&gt;', 'code escapes html')
assertIncludes(code, '&lt;script&gt;alert(1)&lt;/script&gt;', 'code escapes script')

const heading = markdownBlockToHtml('## 阅读体验')
assertIncludes(heading, '<h2 id="阅读体验">阅读体验</h2>', 'heading gets stable anchor id')

const duplicateHeadings = markdownToHtml('## 概览\n\n## 概览\n\n### **React** 与 `Go`')
assertIncludes(duplicateHeadings, '<h2 id="概览">概览</h2>', 'first duplicate heading id')
assertIncludes(duplicateHeadings, '<h2 id="概览-2">概览</h2>', 'second duplicate heading id')
assertIncludes(duplicateHeadings, '<h3 id="react-与-go"><strong>React</strong> 与 <code>Go</code></h3>', 'inline heading id')

const tocHeadings = extractArticleHeadings('## 概览\n\n普通段落\n\n### **React** 与 `Go`\n\n```md\n## 代码里的标题\n```')
assertIncludes(JSON.stringify(tocHeadings), '"id":"概览"', 'toc extracts h2 id')
assertIncludes(JSON.stringify(tocHeadings), '"text":"React 与 Go"', 'toc strips inline markup')
assertNotIncludes(JSON.stringify(tocHeadings), '代码里的标题', 'toc ignores fenced headings')
const imageWithParentheses = markdownBlockToHtml('![cover](https://cdn.example.com/image%20(1).png)')
assertIncludes(imageWithParentheses, '<img src="https://cdn.example.com/image%20(1).png"', 'image URL with parentheses')

const mixedWithoutBlankLines = markdownToHtml('## Intro\nBody line\n- one\n- **two**\n> note\n![photo](https://cdn.example.com/photo%20(2).jpg)\nNext paragraph')
assertIncludes(mixedWithoutBlankLines, '<h2 id="intro">Intro</h2>', 'heading without trailing blank line')
assertIncludes(mixedWithoutBlankLines, '<p>Body line</p>', 'paragraph before list without blank line')
assertIncludes(mixedWithoutBlankLines, '<ul><li>one</li><li><strong>two</strong></li></ul>', 'list after paragraph without blank line')
assertIncludes(mixedWithoutBlankLines, '<blockquote><p>note</p></blockquote>', 'blockquote before image without blank line')
assertIncludes(mixedWithoutBlankLines, '<img src="https://cdn.example.com/photo%20(2).jpg"', 'image after blockquote without blank line')
assertIncludes(mixedWithoutBlankLines, '<p>Next paragraph</p>', 'paragraph after image without blank line')

const singleItemLists = markdownToHtml('- only item\n\n1. only step')
assertIncludes(singleItemLists, '<ul><li>only item</li></ul>', 'single unordered list item')
assertIncludes(singleItemLists, '<ol><li>only step</li></ol>', 'single ordered list item')

const tocWithoutBlankLines = extractArticleHeadings('## Intro\nBody\n### Details')
assertIncludes(JSON.stringify(tocWithoutBlankLines), '"id":"intro"', 'toc sees heading before body without blank line')
assertIncludes(JSON.stringify(tocWithoutBlankLines), '"id":"details"', 'toc sees heading after body without blank line')

const inlineHtml = markdownToHtml('> `name` <span style="border: 2px solid black; padding: 1px;"><code>marked</code></span> `next`')
assertIncludes(inlineHtml, '<blockquote>', 'inline html blockquote')
assertIncludes(inlineHtml, '<span style="border: 2px solid black; padding: 1px"><code>marked</code></span>', 'safe inline html remains')

const unsafeHtml = markdownToHtml('<script>alert(1)</script><span onclick="alert(1)" style="background-image: url(javascript:alert(1)); border: 1px solid red">ok</span><img src="javascript:alert(1)" onerror="alert(1)" alt="x">')
assertNotIncludes(unsafeHtml, '<script', 'script tag blocked')
assertNotIncludes(unsafeHtml, 'onclick', 'event attribute blocked')
assertNotIncludes(unsafeHtml, 'background-image', 'unsafe style blocked')
assertNotIncludes(unsafeHtml, 'javascript:alert', 'javascript url blocked')
assertNotIncludes(unsafeHtml, 'onerror', 'image event attribute blocked')
assertIncludes(unsafeHtml, '<span style="border: 1px solid red">ok</span>', 'safe style declaration remains')

const rawHtmlMedia = markdownToHtml('<a href="https://example.com?a=1&b=2">site</a><br><img src="https://example.com/a.png" alt="A">')
assertIncludes(rawHtmlMedia, '<a href="https://example.com?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">site</a>', 'raw html link normalized')
assertIncludes(rawHtmlMedia, '<br />', 'raw html br remains')
assertIncludes(rawHtmlMedia, '<img src="https://example.com/a.png" alt="A" loading="lazy" />', 'raw html image normalized')

const rawHtmlBlock = markdownToHtml('<div class="note" style="padding: 8px"><span>HTML</span></div>\n\nText')
assertIncludes(rawHtmlBlock, '<div class="note" style="padding: 8px"><span>HTML</span></div>', 'raw html block remains unwrapped')
assertNotIncludes(rawHtmlBlock, '<p><div', 'raw html block is not wrapped in paragraph')
assertIncludes(rawHtmlBlock, '<p>Text</p>', 'markdown after raw html block renders')
