export const routeChunkLoaders = {
  account: () => import('./pages/AccountPage'),
  activityLogs: () => import('./pages/ActivityLogsPage'),
  adminDashboard: () => import('./pages/AdminDashboard'),
  analytics: () => import('./pages/AnalyticsPage'),
  backup: () => import('./pages/BackupPage'),
  comments: () => import('./pages/CommentsPage'),
  contentPreview: () => import('./pages/ContentPreviewPage'),
  friendLinks: () => import('./pages/FriendLinksPage'),
  login: () => import('./pages/LoginPage'),
  media: () => import('./pages/MediaPage'),
  pagesManager: () => import('./pages/PagesManagerPage'),
  postEditor: () => import('./pages/PostEditorPage'),
  postsManager: () => import('./pages/PostsManagerPage'),
  publicArchives: () => import('./pages/PublicArchivesPage'),
  publicFriendLinks: () => import('./pages/PublicFriendLinksPage'),
  publicHome: () => import('./pages/PublicHomePage'),
  publicPage: () => import('./pages/PublicPagePage'),
  publicPost: () => import('./pages/PublicPostPage'),
  publicTaxonomy: () => import('./pages/PublicTaxonomyPage'),
  settings: () => import('./pages/SettingsPage'),
  system: () => import('./pages/SystemPage'),
  taxonomy: () => import('./pages/TaxonomyPage'),
  translations: () => import('./pages/TranslationsPage'),
  users: () => import('./pages/UsersPage'),
} as const

export type RouteChunkKey = keyof typeof routeChunkLoaders

export const routeChunkKeys = Object.keys(routeChunkLoaders) as RouteChunkKey[]
