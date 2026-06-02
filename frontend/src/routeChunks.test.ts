import { routeChunkKeys, routeChunkLoaders } from './routeChunks.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const expectedKeys = [
  'account',
  'activityLogs',
  'adminDashboard',
  'analytics',
  'backup',
  'comments',
  'contentPreview',
  'friendLinks',
  'login',
  'media',
  'pagesManager',
  'postEditor',
  'postsManager',
  'publicArchives',
  'publicFriendLinks',
  'publicHome',
  'publicPage',
  'publicPost',
  'publicTaxonomy',
  'settings',
  'system',
  'taxonomy',
  'translations',
  'users',
] as const

assertEqual(routeChunkKeys.join(','), expectedKeys.join(','), 'route chunk key order')

for (const key of expectedKeys) {
  assertEqual(typeof routeChunkLoaders[key], 'function', `${key} loader is dynamic import function`)
}
