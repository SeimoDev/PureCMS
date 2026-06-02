import type { Page, PageInput } from './types'

export function pageToInput(page: Page): PageInput {
  return {
    title: page.title,
    slug: page.slug,
    content: page.content,
    status: page.status,
    showInNav: page.showInNav,
    navLabel: page.navLabel,
    sortOrder: page.sortOrder,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  }
}

export function pageInputWithStatus(page: Page, status: Page['status']): PageInput {
  return {
    ...pageToInput(page),
    status,
  }
}
