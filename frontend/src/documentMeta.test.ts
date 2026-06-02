import { buildDocumentMeta, serializeStructuredData } from './documentMeta.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const home = buildDocumentMeta({
  siteTitle: '茶馆日志',
  siteDescription: '写给中文互联网读者的技术与生活记录',
  siteKeywords: '个人博客,技术博客,React',
})

assertEqual(home.title, '茶馆日志', 'home title')
assertEqual(home.description, '写给中文互联网读者的技术与生活记录', 'home description')
assertEqual(home.keywords, '个人博客,技术博客,React', 'home keywords')
assertEqual(home.socialType, 'website', 'home social type')

const post = buildDocumentMeta({
  siteTitle: '茶馆日志',
  siteKeywords: '个人博客,Go',
  title: 'Material Design 3 CMS 实践',
  description: '从 React、Go、PostgreSQL 到 Docker 的完整个人博客系统。',
  keywords: ['Go', 'PostgreSQL', 'CMS', ''],
  canonicalUrl: ' https://blog.example.cn/posts/md3-cms ',
  imageUrl: ' https://cdn.example.cn/covers/md3.jpg ',
})

assertEqual(post.title, 'Material Design 3 CMS 实践 - 茶馆日志', 'post title')
assertEqual(post.description, '从 React、Go、PostgreSQL 到 Docker 的完整个人博客系统。', 'post description')
assertEqual(post.keywords, '个人博客,Go,PostgreSQL,CMS', 'post keywords')
assertEqual(post.socialType, 'article', 'post social type')
assertEqual(post.siteName, '茶馆日志', 'post site name')
assertEqual(post.canonicalUrl, 'https://blog.example.cn/posts/md3-cms', 'post canonical url')
assertEqual(post.imageUrl, 'https://cdn.example.cn/covers/md3.jpg', 'post image url')
assertEqual(post.twitterCard, 'summary_large_image', 'post twitter large image card')

const relativeSocialImage = buildDocumentMeta({
  siteTitle: '茶馆日志',
  title: '相对封面',
  canonicalUrl: 'https://blog.example.cn/posts/relative-cover',
  imageUrl: '/uploads/2026/06/cover.jpg',
})

assertEqual(relativeSocialImage.imageUrl, 'https://blog.example.cn/uploads/2026/06/cover.jpg', 'relative og image becomes absolute')

const relativeCanonical = buildDocumentMeta({
  siteTitle: '茶馆日志',
  title: '相对链接',
  baseUrl: 'https://blog.example.cn/base/',
  canonicalUrl: '/posts/relative-canonical',
})

assertEqual(relativeCanonical.canonicalUrl, 'https://blog.example.cn/posts/relative-canonical', 'relative canonical becomes absolute')

const relativeFeed = buildDocumentMeta({
  siteTitle: 'Tea Journal',
  baseUrl: 'https://blog.example.cn/posts/md3-cms',
  feedUrl: '/rss.xml',
})

assertEqual(relativeFeed.feedUrl, 'https://blog.example.cn/rss.xml', 'relative rss feed becomes absolute')

const multilingual = buildDocumentMeta({
  siteTitle: '茶馆日志',
  baseUrl: 'https://blog.example.cn/posts/md3-cms',
  canonicalUrl: '/posts/md3-cms',
  alternateLanguages: [
    { hreflang: 'zh-CN', href: '/posts/md3-cms' },
    { hreflang: 'en', href: '/posts/md3-cms?lang=en' },
    { hreflang: 'en', href: '/duplicate' },
    { hreflang: '', href: '/missing-language' },
    { hreflang: 'ja', href: '' },
    { hreflang: 'x-default', href: '/posts/md3-cms' },
  ],
})

assertEqual(String(multilingual.alternateLanguages.length), '3', 'alternate languages are filtered and deduplicated')
assertEqual(multilingual.alternateLanguages[0]?.hreflang ?? '', 'zh-CN', 'first alternate language preserved')
assertEqual(multilingual.alternateLanguages[0]?.href ?? '', 'https://blog.example.cn/posts/md3-cms', 'relative alternate URL becomes absolute')
assertEqual(multilingual.alternateLanguages[1]?.href ?? '', 'https://blog.example.cn/posts/md3-cms?lang=en', 'alternate language keeps query')
assertEqual(multilingual.alternateLanguages[2]?.hreflang ?? '', 'x-default', 'x-default alternate preserved')

const fallback = buildDocumentMeta({
  siteTitle: '  ',
  siteDescription: '',
  title: ' 关于 ',
  description: '   ',
})

assertEqual(fallback.title, '关于 - 个人博客', 'fallback title')
assertEqual(fallback.description, '记录技术、生活和长期思考', 'fallback description')

const englishFallback = buildDocumentMeta({
  siteTitle: ' ',
  siteDescription: '',
  description: '',
  languageCode: 'en-US',
})

assertEqual(englishFallback.title, 'Personal Blog', 'english fallback title')
assertEqual(englishFallback.description, 'Notes on technology, life, and long-term thinking', 'english fallback description')

const arabicFallback = buildDocumentMeta({
  siteTitle: '',
  siteDescription: '',
  title: ' ',
  languageCode: 'ar',
})

assertEqual(arabicFallback.title, 'مدونة شخصية', 'arabic fallback title')
assertEqual(arabicFallback.description, 'ملاحظات عن التقنية والحياة والتفكير طويل المدى', 'arabic fallback description')

const verified = buildDocumentMeta({
  siteTitle: '茶馆日志',
  verifications: {
    baidu: ' codeva-example ',
    google: '   ',
    bing: 'ms-example',
    so360: '360-example',
    sogou: 'sogou-example',
  },
})

assertEqual(verified.verifications.baidu, 'codeva-example', 'baidu verification trimmed')
assertEqual(verified.verifications.google, '', 'empty google verification removed')
assertEqual(verified.verifications.bing, 'ms-example', 'bing verification preserved')
assertEqual(verified.verifications.so360, '360-example', '360 verification preserved')
assertEqual(verified.verifications.sogou, 'sogou-example', 'sogou verification preserved')

const structured = buildDocumentMeta({
  siteTitle: '茶馆日志',
  title: '结构化数据',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '结构化数据',
  },
})

assertEqual(String(structured.structuredData.length), '1', 'structured data count')
assertEqual(String(structured.structuredData[0]?.['@type']), 'Article', 'structured data type')

const serializedStructuredData = serializeStructuredData([
  { '@context': 'https://schema.org', '@type': 'WebSite', name: '茶馆日志' },
  { '@context': 'https://schema.org', '@type': 'Article', headline: '</script><img src=x>' },
])

if (!serializedStructuredData.includes('"@type":"Article"')) {
  throw new Error(`structured data JSON missing article: ${serializedStructuredData}`)
}
if (serializedStructuredData.includes('</script>') || !serializedStructuredData.includes('\\u003c/script>')) {
  throw new Error(`structured data JSON was not safely escaped: ${serializedStructuredData}`)
}
