import { pageInputWithStatus, pageToInput } from './pages.js'
import type { Page } from './types.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const page: Page = {
  id: 'page-1',
  title: '关于',
  slug: 'about',
  content: '长期项目和联系方式',
  status: 'draft',
  showInNav: true,
  navLabel: '关于我',
  sortOrder: 20,
  seoTitle: '关于站长',
  seoDescription: '站点说明',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  deletedAt: null,
}

const input = pageToInput(page)
assertEqual(input.title, '关于', 'keeps title')
assertEqual(input.navLabel, '关于我', 'keeps nav label')
assertEqual(String(input.showInNav), 'true', 'keeps nav visibility')
assertEqual(String(input.sortOrder), '20', 'keeps sort order')
assertEqual(input.seoTitle, '关于站长', 'keeps seo title')

const published = pageInputWithStatus(page, 'published')
assertEqual(published.status, 'published', 'updates status')
assertEqual(published.title, page.title, 'status update keeps title')
assertEqual(published.slug, page.slug, 'status update keeps slug')
assertEqual(published.content, page.content, 'status update keeps content')
assertEqual(published.navLabel, page.navLabel, 'status update keeps nav label')
assertEqual(String(published.showInNav), 'true', 'status update keeps nav visibility')
assertEqual(String(published.sortOrder), '20', 'status update keeps sort order')
assertEqual(published.seoDescription, page.seoDescription, 'status update keeps seo description')
