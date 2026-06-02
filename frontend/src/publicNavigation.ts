import type { Page } from './types'

export type PublicNavKind = 'home' | 'archives' | 'links' | 'page'

export type PublicNavItem = {
  key: string
  kind: PublicNavKind
  label: string
  to: string
}

export function publicNavItems(pages: Page[]): PublicNavItem[] {
  return [
    { key: 'home', kind: 'home', label: '首页', to: '/' },
    { key: 'archives', kind: 'archives', label: '归档', to: '/archives' },
    { key: 'links', kind: 'links', label: '友链', to: '/links' },
    ...pages.map((page) => ({
      key: `page-${page.id}`,
      kind: 'page' as const,
      label: page.navLabel || page.title,
      to: `/pages/${page.slug}`,
    })),
  ]
}
