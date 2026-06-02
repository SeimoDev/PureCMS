import { publicNavItems } from './publicNavigation.js'
import type { Page } from './types.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const pages: Page[] = [
  {
    id: 'page-1',
    title: '关于',
    slug: 'about',
    content: '',
    status: 'published',
    showInNav: true,
    navLabel: '关于我',
    sortOrder: 10,
    seoTitle: '',
    seoDescription: '',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    deletedAt: null,
  },
  {
    id: 'page-2',
    title: '时间线',
    slug: 'timeline',
    content: '',
    status: 'published',
    showInNav: true,
    navLabel: '',
    sortOrder: 20,
    seoTitle: '',
    seoDescription: '',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    deletedAt: null,
  },
]

const items = publicNavItems(pages)

assertEqual(items.map((item) => item.label).join(','), '首页,归档,友链,关于我,时间线', 'nav labels')
assertEqual(items.map((item) => item.to).join(','), '/,/archives,/links,/pages/about,/pages/timeline', 'nav paths')
assertEqual(items.map((item) => item.kind).join(','), 'home,archives,links,page,page', 'nav kinds')
