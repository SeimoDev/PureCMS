import { buildBlogPostingStructuredData, buildWebPageStructuredData, buildWebSiteStructuredData } from './structuredData.js'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const website = buildWebSiteStructuredData({
  name: 'Tea Journal',
  description: 'A personal writing archive',
  url: 'https://blog.example.cn/',
  searchUrl: 'https://blog.example.cn/?q={search_term_string}',
})

assertEqual(website['@context'], 'https://schema.org', 'website context')
assertEqual(website['@type'], 'WebSite', 'website type')
assertEqual(website.name, 'Tea Journal', 'website name')
assertEqual(website.url, 'https://blog.example.cn/', 'website url')
assertEqual((website.potentialAction as Record<string, unknown>)?.['@type'], 'SearchAction', 'website search action type')
assertEqual(
  (website.potentialAction as Record<string, unknown>)?.target,
  'https://blog.example.cn/?q={search_term_string}',
  'website search target',
)

const post = buildBlogPostingStructuredData({
  title: 'Material Design 3 CMS',
  description: 'React, Go, and PostgreSQL CMS implementation notes',
  url: 'https://blog.example.cn/posts/md3-cms',
  imageUrl: '/uploads/2026/06/cover.jpg',
  datePublished: '2026-06-01T08:00:00Z',
  dateModified: '2026-06-02T08:00:00Z',
  authorName: 'Admin',
  siteName: 'Tea Journal',
  language: 'en',
  keywords: ['React', 'CMS', ''],
})

assertEqual(post['@type'], 'BlogPosting', 'post type')
assertEqual(post.headline, 'Material Design 3 CMS', 'post headline')
assertEqual((post.mainEntityOfPage as Record<string, unknown>)?.['@id'], 'https://blog.example.cn/posts/md3-cms', 'post main entity')
assertEqual((post.image as string[])?.[0], 'https://blog.example.cn/uploads/2026/06/cover.jpg', 'post absolute image')
assertEqual((post.author as Record<string, unknown>)?.name, 'Admin', 'post author')
assertEqual((post.publisher as Record<string, unknown>)?.name, 'Tea Journal', 'post publisher')
assertEqual(post.inLanguage, 'en', 'post language')
assertEqual(post.keywords, 'React,CMS', 'post keywords')

const page = buildWebPageStructuredData({
  title: 'About',
  description: 'About this site',
  url: 'https://blog.example.cn/pages/about',
  siteName: 'Tea Journal',
  language: 'en',
  dateModified: '2026-06-02T09:00:00Z',
})

assertEqual(page['@type'], 'WebPage', 'page type')
assertEqual(page.name, 'About', 'page name')
assertEqual(page.description, 'About this site', 'page description')
assertEqual((page.isPartOf as Record<string, unknown>)?.['@type'], 'WebSite', 'page site type')
assertEqual((page.isPartOf as Record<string, unknown>)?.name, 'Tea Journal', 'page site name')
assertEqual(page.dateModified, '2026-06-02T09:00:00Z', 'page modified date')
