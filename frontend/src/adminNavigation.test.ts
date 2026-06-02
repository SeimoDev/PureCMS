import { adminNavItems, blockedAdminNavItem, isActiveAdminPath, visibleAdminNavItems } from './adminNavigation.js'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const adminOnlyPaths = ['/admin/users', '/admin/activity', '/admin/backup', '/admin/system', '/admin/translations', '/admin/settings']

assertEqual(adminNavItems.length, 15, 'admin navigation should keep all management entries')
for (const path of adminOnlyPaths) {
  const item = adminNavItems.find((entry) => entry.to === path)
  assert(item?.adminOnly, `${path} should be marked admin-only`)
}

const editorPaths = visibleAdminNavItems('editor').map((item) => item.to)
for (const path of adminOnlyPaths) {
  assert(!editorPaths.includes(path), `editor navigation should hide ${path}`)
}
assert(editorPaths.includes('/admin/posts'), 'editor navigation should keep post management')
assert(editorPaths.includes('/admin/comments'), 'editor navigation should keep comment moderation')

const adminPaths = visibleAdminNavItems('admin').map((item) => item.to)
for (const path of adminOnlyPaths) {
  assert(adminPaths.includes(path), `admin navigation should show ${path}`)
}

assertEqual(blockedAdminNavItem('/admin/users', 'editor')?.to, '/admin/users', 'editor direct user route should be blocked')
assertEqual(blockedAdminNavItem('/admin/translations?page=1', 'editor'), undefined, 'route matcher should receive pathname without query')
assertEqual(blockedAdminNavItem('/admin/translations', 'editor')?.to, '/admin/translations', 'editor translation route should be blocked')
assertEqual(blockedAdminNavItem('/admin/posts/new', 'editor'), undefined, 'editor post editor route should be allowed')
assertEqual(blockedAdminNavItem('/admin/settings', 'admin'), undefined, 'admin settings route should be allowed')

assertEqual(isActiveAdminPath('/admin/posts/new', '/admin/posts'), true, 'post child route should activate posts nav')
assertEqual(isActiveAdminPath('/administer', '/admin'), false, 'admin root should not match unrelated prefixes')
