import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { commonUIText } from './commonUII18n'
import LoadingState from './components/LoadingState'
import { preferredLanguageFromEnvironment } from './i18n'
import AdminLayout from './layouts/AdminLayout'
import PublicLayout from './layouts/PublicLayout'
import { routeChunkLoaders } from './routeChunks'

const AccountPage = lazy(routeChunkLoaders.account)
const ActivityLogsPage = lazy(routeChunkLoaders.activityLogs)
const AdminDashboard = lazy(routeChunkLoaders.adminDashboard)
const AnalyticsPage = lazy(routeChunkLoaders.analytics)
const BackupPage = lazy(routeChunkLoaders.backup)
const CommentsPage = lazy(routeChunkLoaders.comments)
const ContentPreviewPage = lazy(routeChunkLoaders.contentPreview)
const FriendLinksPage = lazy(routeChunkLoaders.friendLinks)
const LoginPage = lazy(routeChunkLoaders.login)
const MediaPage = lazy(routeChunkLoaders.media)
const PagesManagerPage = lazy(routeChunkLoaders.pagesManager)
const PostEditorPage = lazy(routeChunkLoaders.postEditor)
const PostsManagerPage = lazy(routeChunkLoaders.postsManager)
const PublicArchivesPage = lazy(routeChunkLoaders.publicArchives)
const PublicFriendLinksPage = lazy(routeChunkLoaders.publicFriendLinks)
const PublicHomePage = lazy(routeChunkLoaders.publicHome)
const PublicPagePage = lazy(routeChunkLoaders.publicPage)
const PublicPostPage = lazy(routeChunkLoaders.publicPost)
const PublicTaxonomyPage = lazy(routeChunkLoaders.publicTaxonomy)
const SettingsPage = lazy(routeChunkLoaders.settings)
const SystemPage = lazy(routeChunkLoaders.system)
const TaxonomyPage = lazy(routeChunkLoaders.taxonomy)
const TranslationsPage = lazy(routeChunkLoaders.translations)
const UsersPage = lazy(routeChunkLoaders.users)

function suspenseLanguage() {
  if (typeof window === 'undefined') return 'zh-CN'
  return preferredLanguageFromEnvironment(window.localStorage, window.navigator.languages)
}

function page(element: ReactNode) {
  return <Suspense fallback={<LoadingState label={commonUIText(suspenseLanguage()).loadingPage} />}>{element}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={page(<PublicHomePage />)} />
        <Route path="/archives" element={page(<PublicArchivesPage />)} />
        <Route path="/links" element={page(<PublicFriendLinksPage />)} />
        <Route path="/categories/:slug" element={page(<PublicTaxonomyPage kind="category" />)} />
        <Route path="/tags/:slug" element={page(<PublicTaxonomyPage kind="tag" />)} />
        <Route path="/posts/:slug" element={page(<PublicPostPage />)} />
        <Route path="/pages/:slug" element={page(<PublicPagePage />)} />
      </Route>
      <Route path="/login" element={page(<LoginPage />)} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={page(<AdminDashboard />)} />
        <Route path="account" element={page(<AccountPage />)} />
        <Route path="analytics" element={page(<AnalyticsPage />)} />
        <Route path="posts" element={page(<PostsManagerPage />)} />
        <Route path="posts/new" element={page(<PostEditorPage />)} />
        <Route path="posts/:id" element={page(<PostEditorPage />)} />
        <Route path="pages" element={page(<PagesManagerPage />)} />
        <Route path="preview/:kind/:id" element={page(<ContentPreviewPage />)} />
        <Route path="media" element={page(<MediaPage />)} />
        <Route path="taxonomy" element={page(<TaxonomyPage />)} />
        <Route path="friend-links" element={page(<FriendLinksPage />)} />
        <Route path="comments" element={page(<CommentsPage />)} />
        <Route path="users" element={page(<UsersPage />)} />
        <Route path="activity" element={page(<ActivityLogsPage />)} />
        <Route path="backup" element={page(<BackupPage />)} />
        <Route path="system" element={page(<SystemPage />)} />
        <Route path="translations" element={page(<TranslationsPage />)} />
        <Route path="settings" element={page(<SettingsPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
