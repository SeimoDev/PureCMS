import { postAuthorLabel, postEngagementLabel } from './postAdminMeta.js'
import type { Post } from './types.js'

const post: Post = {
  id: 'post-1',
  title: '运营信息文章',
  slug: 'ops-post',
  excerpt: '',
  content: '',
  sourceLanguage: 'zh-CN',
  coverUrl: '',
  status: 'published',
  featured: false,
  seoTitle: '',
  seoDescription: '',
  authorId: 'user-1',
  authorName: '  站长甲  ',
  viewCount: 28000,
  commentCount: 12,
  categories: [],
  tags: [],
  publishedAt: '2026-06-01T00:00:00Z',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  deletedAt: null,
}

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(postAuthorLabel(post), '站长甲', 'trims author name')
assertEqual(postAuthorLabel({ ...post, authorName: '' }), '站长', 'falls back empty author')
assertEqual(postEngagementLabel(post), '2.8万 浏览 · 12 评论', 'formats engagement counts')
assertEqual(postEngagementLabel({ ...post, viewCount: 0, commentCount: 0 }), '0 浏览 · 0 评论', 'formats zero engagement')
assertEqual(
  postAuthorLabel({ ...post, authorName: '' }, { fallbackAuthor: 'Owner', views: 'views', comments: 'comments', locale: 'en' }),
  'Owner',
  'falls back localized author',
)
assertEqual(
  postEngagementLabel(post, { fallbackAuthor: 'Owner', views: 'views', comments: 'comments', locale: 'en' }),
  '28K views · 12 comments',
  'formats localized engagement counts',
)
