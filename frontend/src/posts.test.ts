import { postInputWithFeatured, postInputWithStatus, postToInput, selectedPostInputs } from './posts.js'
import type { Post } from './types.js'

const post: Post = {
  id: 'post-1',
  title: 'Batch status post',
  slug: 'batch-status-post',
  excerpt: 'excerpt',
  content: 'content',
  sourceLanguage: 'zh-CN',
  coverUrl: '/cover.jpg',
  status: 'draft',
  featured: true,
  seoTitle: 'SEO title',
  seoDescription: 'SEO description',
  authorId: 'user-1',
  authorName: 'Admin',
  viewCount: 12,
  commentCount: 3,
  categories: [
    { id: 'cat-1', name: 'Tech', slug: 'tech', description: '', sortOrder: 0, postCount: 1, referenceCount: 1, createdAt: '2026-01-01T00:00:00Z' },
  ],
  tags: [
    { id: 'tag-1', name: 'React', slug: 'react', postCount: 1, referenceCount: 1, createdAt: '2026-01-01T00:00:00Z' },
    { id: 'tag-2', name: 'Go', slug: 'go', postCount: 1, referenceCount: 1, createdAt: '2026-01-01T00:00:00Z' },
  ],
  publishedAt: '2026-01-02T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-03T00:00:00Z',
  deletedAt: null,
}

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const input = postToInput(post)
assertEqual(input.categoryIds.join(','), 'cat-1', 'maps categories to category ids')
assertEqual(input.tagIds.join(','), 'tag-1,tag-2', 'maps tags to tag ids')
assertEqual(input.publishedAt ?? '', '2026-01-02T00:00:00Z', 'preserves published time')
assertEqual(input.sourceLanguage, 'zh-CN', 'preserves source language')

const published = postInputWithStatus({ ...post, publishedAt: null }, 'published')
assertEqual(published.status, 'published', 'sets published status')
assertEqual(String(published.publishedAt), 'null', 'lets backend publish immediately when no time exists')

const draft = postInputWithStatus(post, 'draft')
assertEqual(draft.status, 'draft', 'sets draft status')
assertEqual(String(draft.publishedAt), 'null', 'clears published time for draft')

const archived = postInputWithStatus(post, 'archived')
assertEqual(archived.status, 'archived', 'sets archived status')
assertEqual(String(archived.publishedAt), 'null', 'clears published time for archived')

const unfeatured = postInputWithFeatured(post, false)
assertEqual(String(unfeatured.featured), 'false', 'clears featured flag')
assertEqual(unfeatured.status, 'draft', 'featured update preserves status')
assertEqual(unfeatured.slug, 'batch-status-post', 'featured update preserves slug')

const featured = postInputWithFeatured({ ...post, featured: false }, true)
assertEqual(String(featured.featured), 'true', 'sets featured flag')
assertEqual(featured.categoryIds.join(','), 'cat-1', 'featured update preserves categories')

const loadedIds: string[] = []
const selectedInputs = await selectedPostInputs(
  ['post-1', 'post-2'],
  [post],
  async (id) => {
    loadedIds.push(id)
    return { ...post, id, title: 'Cross-page post', slug: 'cross-page-post', featured: false }
  },
  (item) => postInputWithFeatured(item, true),
)

assertEqual(selectedInputs.map((item) => item.id).join(','), 'post-1,post-2', 'keeps selected id order')
assertEqual(loadedIds.join(','), 'post-2', 'loads selected posts missing from the current page')
assertEqual(selectedInputs[0].input.slug, 'batch-status-post', 'uses current page post snapshot when available')
assertEqual(selectedInputs[1].input.slug, 'cross-page-post', 'uses loaded post snapshot for cross-page selection')
assertEqual(String(selectedInputs[1].input.featured), 'true', 'maps loaded post to requested bulk input')
