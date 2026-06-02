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
