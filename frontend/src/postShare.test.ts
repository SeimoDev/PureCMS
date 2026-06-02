import { buildPostShareText, buildQzoneShareUrl, buildWeiboShareUrl, copyShareText, postShareCopyText } from './postShare.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const input = {
  title: '把个人博客做成内容中枢',
  excerpt: 'React + Go + PostgreSQL 的完整 CMS。',
  url: 'https://blog.example.cn/posts/hello-cms?from=首页',
  coverUrl: 'https://cdn.example.cn/cover.jpg',
}

assertEqual(
  buildPostShareText(input),
  '把个人博客做成内容中枢：React + Go + PostgreSQL 的完整 CMS。',
  'share text with excerpt',
)
assertEqual(buildPostShareText({ ...input, excerpt: '   ' }), '把个人博客做成内容中枢', 'share text without excerpt')
assertEqual(postShareCopyText(input), '把个人博客做成内容中枢\nhttps://blog.example.cn/posts/hello-cms?from=首页', 'copy text')

const weibo = new URL(buildWeiboShareUrl(input))
assertEqual(weibo.origin + weibo.pathname, 'https://service.weibo.com/share/share.php', 'weibo endpoint')
assertEqual(weibo.searchParams.get('url') ?? '', input.url, 'weibo url')
assertEqual(weibo.searchParams.get('title') ?? '', buildPostShareText(input), 'weibo title')
assertEqual(weibo.searchParams.get('pic') ?? '', input.coverUrl, 'weibo cover')

const qzone = new URL(buildQzoneShareUrl(input))
assertEqual(qzone.origin + qzone.pathname, 'https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey', 'qzone endpoint')
assertEqual(qzone.searchParams.get('url') ?? '', input.url, 'qzone url')
assertEqual(qzone.searchParams.get('title') ?? '', input.title, 'qzone title')
assertEqual(qzone.searchParams.get('summary') ?? '', input.excerpt, 'qzone summary')
assertEqual(qzone.searchParams.get('pics') ?? '', input.coverUrl, 'qzone cover')

const relativeCoverInput = {
  ...input,
  url: 'https://blog.example.cn/posts/relative-cover',
  coverUrl: '/uploads/2026/06/cover.jpg',
}
const relativeWeibo = new URL(buildWeiboShareUrl(relativeCoverInput))
const relativeQzone = new URL(buildQzoneShareUrl(relativeCoverInput))

assertEqual(relativeWeibo.searchParams.get('pic') ?? '', 'https://blog.example.cn/uploads/2026/06/cover.jpg', 'weibo relative cover becomes absolute')
assertEqual(relativeQzone.searchParams.get('pics') ?? '', 'https://blog.example.cn/uploads/2026/06/cover.jpg', 'qzone relative cover becomes absolute')

assertEqual(
  await copyShareText('hello', {
    clipboardWriteText: async () => undefined,
    legacyCopyText: () => {
      throw new Error('legacy should not run after clipboard success')
    },
  }),
  'copied',
  'clipboard success copies share text',
)

let legacyValue = ''
assertEqual(
  await copyShareText('fallback text', {
    clipboardWriteText: async () => {
      throw new Error('blocked')
    },
    legacyCopyText: (value) => {
      legacyValue = value
      return true
    },
  }),
  'copied',
  'legacy copy runs after clipboard failure',
)
assertEqual(legacyValue, 'fallback text', 'legacy copy receives share text')

assertEqual(
  await copyShareText('manual text', {
    clipboardWriteText: async () => {
      throw new Error('blocked')
    },
    legacyCopyText: () => false,
  }),
  'manual',
  'manual fallback when all copy strategies fail',
)
