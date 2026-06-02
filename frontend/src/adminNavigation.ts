import type { AdminUIText } from './adminI18n'

export type AdminRole = 'admin' | 'editor' | string
export type AdminNavKey = keyof AdminUIText['shell']['nav']

export type AdminNavItem = {
  to: string
  labelKey: AdminNavKey
  adminOnly?: boolean
}

export const adminNavItems = [
  { to: '/admin', labelKey: 'dashboard' },
  { to: '/admin/account', labelKey: 'account' },
  { to: '/admin/analytics', labelKey: 'analytics' },
  { to: '/admin/posts', labelKey: 'posts' },
  { to: '/admin/pages', labelKey: 'pages' },
  { to: '/admin/media', labelKey: 'media' },
  { to: '/admin/taxonomy', labelKey: 'taxonomy' },
  { to: '/admin/friend-links', labelKey: 'friendLinks' },
  { to: '/admin/comments', labelKey: 'comments' },
  { to: '/admin/users', labelKey: 'users', adminOnly: true },
  { to: '/admin/activity', labelKey: 'activity', adminOnly: true },
  { to: '/admin/backup', labelKey: 'backup', adminOnly: true },
  { to: '/admin/system', labelKey: 'system', adminOnly: true },
  { to: '/admin/translations', labelKey: 'translations', adminOnly: true },
  { to: '/admin/settings', labelKey: 'settings', adminOnly: true },
] satisfies AdminNavItem[]

export function isActiveAdminPath(pathname: string, target: string) {
  return pathname === target || (target !== '/admin' && pathname.startsWith(`${target}/`))
}

export function visibleAdminNavItems(role: AdminRole) {
  return adminNavItems.filter((item) => !item.adminOnly || role === 'admin')
}

export function blockedAdminNavItem(pathname: string, role: AdminRole) {
  if (role === 'admin') return undefined
  return adminNavItems.find((item) => item.adminOnly && isActiveAdminPath(pathname, item.to))
}
