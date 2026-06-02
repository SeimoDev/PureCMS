import type {
  AccountPasswordInput,
  AccountProfileInput,
  AnalyticsSummary,
  ArchiveYear,
  AuthResponse,
  BackfillTranslationCachesResult,
  ActivityLog,
  BackupImportResult,
  BackupSnapshot,
  Category,
  Comment,
  DeleteOldActivityLogsResult,
  DeleteTranslationCachesResult,
  DashboardStats,
  FriendLink,
  FriendLinkInput,
  MediaAsset,
  Page,
  PageInput,
  PageRevision,
  Paginated,
  Post,
  PostInput,
  PostTranslation,
  PostRevision,
  SiteSettings,
  SystemStatus,
  Tag,
  TranslationCacheItem,
  User,
	UserInput,
} from '../types'
import { normalizeLanguageCode } from '../i18n'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
const TOKEN_KEY = 'purecms_token'
const TOKEN_EXPIRES_AT_KEY = 'purecms_token_expires_at'
const AUTH_EXPIRED_EVENT = 'purecms_auth_expired'
const authEventTarget: EventTarget = typeof window === 'undefined' ? new EventTarget() : window

export class ApiError extends Error {
	status: number

	constructor(message: string, status: number) {
    super(message)
    this.status = status
	}
}

export function apiErrorMessage(err: unknown, fallback: string, languageCode?: string | null) {
	if (!(err instanceof Error)) return fallback
	const message = err.message.trim()
	if (message === '') return fallback
	const code = normalizeLanguageCode(languageCode ?? currentDocumentLanguage())
	if (code !== 'zh-CN' && code !== 'zh-TW' && /[\u3400-\u9FFF]/.test(message)) {
		return fallback
	}
	return message
}

function currentDocumentLanguage() {
	return typeof document === 'undefined' ? '' : document.documentElement.lang
}

type Query = Record<string, string | number | boolean | undefined | null>

function token() {
  const value = localStorage.getItem(TOKEN_KEY)
  if (!value) return null
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)
  if (tokenExpired(expiresAt)) {
    authStorage.clear()
    emitAuthExpired()
    return null
  }
  return value
}

function emitAuthExpired() {
  authEventTarget.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}

function tokenExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

export function buildAPIPath(baseURL: string, path: string, query?: Query) {
  const cleanBase = baseURL.trim().replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const target = `${cleanBase}${cleanPath}`
  const absolute = /^[a-z][a-z\d+\-.]*:\/\//i.test(target)
  const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost'
  const url = new URL(target, base)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  if (!absolute) {
    return `${url.pathname}${url.search}${url.hash}`
  }
  return url.toString()
}

function buildPath(path: string, query?: Query) {
  return buildAPIPath(API_BASE_URL, path, query)
}

async function request<T>(path: string, options: RequestInit = {}, query?: Query): Promise<T> {
  const headers = new Headers(options.headers)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  const authToken = token()
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  const response = await fetch(buildPath(path, query), { ...options, headers })
  if (response.status === 204) {
    return undefined as T
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && authToken) {
      authStorage.clear()
      emitAuthExpired()
    }
		throw new ApiError(typeof payload.error === 'string' ? payload.error : '', response.status)
	}
	return payload as T
}

export const authStorage = {
  get token() {
    return token()
  },
  setToken(value: string, expiresAt?: string | null) {
    localStorage.setItem(TOKEN_KEY, value)
    if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt)
    else localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
  },
}

export const authEvents = {
  onExpired(listener: () => void) {
    const handler = () => listener()
    authEventTarget.addEventListener(AUTH_EXPIRED_EVENT, handler)
    return () => authEventTarget.removeEventListener(AUTH_EXPIRED_EVENT, handler)
  },
}

export const api = {
  site: () => request<SiteSettings>('/site'),
  posts: (query?: Query) => request<Post[]>('/posts', {}, query),
  postsPage: (query?: Query) => request<Paginated<Post>>('/posts', {}, { ...query, paged: 1 }),
  post: (slug: string) => request<Post>(`/posts/${slug}`),
  postTranslation: (slug: string, languageCode: string) =>
    request<PostTranslation>(`/posts/${slug}/translation`, {}, { lang: languageCode }),
  archives: (query?: Query) => request<ArchiveYear[]>('/archives', {}, query),
  pages: () => request<Page[]>('/pages'),
  page: (slug: string) => request<Page>(`/pages/${slug}`),
  publicComments: (postId: string) => request<Comment[]>(`/posts/${postId}/comments`),
  categories: () => request<Category[]>('/categories'),
  tags: () => request<Tag[]>('/tags'),
  friendLinks: () => request<FriendLink[]>('/friend-links'),
  comment: (
    postId: string,
    body: { authorName: string; email: string; website: string; content: string; parentId?: string },
  ) =>
    request<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { username: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<void>('/admin/logout', { method: 'POST' }),
  me: () => request<User>('/admin/me'),
  updateMyProfile: (body: AccountProfileInput) =>
    request<User>('/admin/me/profile', { method: 'PUT', body: JSON.stringify(body) }),
  updateMyPassword: (body: AccountPasswordInput) =>
    request<void>('/admin/me/password', { method: 'PUT', body: JSON.stringify(body) }),
  dashboard: () => request<DashboardStats>('/admin/dashboard'),
  analytics: (days = 14) => request<AnalyticsSummary>('/admin/analytics', {}, { days }),
  systemStatus: () => request<SystemStatus>('/admin/system'),
  adminPosts: (query?: Query) => request<Post[]>('/admin/posts', {}, query),
  adminPostsPage: (query?: Query) => request<Paginated<Post>>('/admin/posts', {}, { ...query, paged: 1 }),
  adminPost: (id: string) => request<Post>(`/admin/posts/${id}`),
  createPost: (body: PostInput) => request<Post>('/admin/posts', { method: 'POST', body: JSON.stringify(body) }),
  updatePost: (id: string, body: PostInput) => request<Post>(`/admin/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePost: (id: string) => request<void>(`/admin/posts/${id}`, { method: 'DELETE' }),
  restorePost: (id: string) => request<void>(`/admin/posts/${id}/restore`, { method: 'POST' }),
  permanentlyDeletePost: (id: string) => request<void>(`/admin/posts/${id}/permanent`, { method: 'DELETE' }),
  adminPages: (query?: Query) => request<Page[]>('/admin/pages', {}, query),
  adminPagesPage: (query?: Query) => request<Paginated<Page>>('/admin/pages', {}, { ...query, paged: 1 }),
  adminPage: (id: string) => request<Page>(`/admin/pages/${id}`),
  createPage: (body: PageInput) => request<Page>('/admin/pages', { method: 'POST', body: JSON.stringify(body) }),
  updatePage: (id: string, body: PageInput) => request<Page>(`/admin/pages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePage: (id: string) => request<void>(`/admin/pages/${id}`, { method: 'DELETE' }),
  restorePage: (id: string) => request<void>(`/admin/pages/${id}/restore`, { method: 'POST' }),
  permanentlyDeletePage: (id: string) => request<void>(`/admin/pages/${id}/permanent`, { method: 'DELETE' }),
  pageRevisions: (id: string) => request<PageRevision[]>(`/admin/pages/${id}/revisions`),
  restorePageRevision: (pageId: string, revisionId: string) =>
    request<Page>(`/admin/pages/${pageId}/revisions/${revisionId}/restore`, { method: 'POST' }),
  postRevisions: (id: string) => request<PostRevision[]>(`/admin/posts/${id}/revisions`),
  restorePostRevision: (postId: string, revisionId: string) =>
    request<Post>(`/admin/posts/${postId}/revisions/${revisionId}/restore`, { method: 'POST' }),
  adminCategories: () => request<Category[]>('/admin/categories'),
  createCategory: (body: Partial<Category>) =>
    request<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<Category>) =>
    request<Category>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request<void>(`/admin/categories/${id}`, { method: 'DELETE' }),
  adminTags: () => request<Tag[]>('/admin/tags'),
  createTag: (body: Partial<Tag>) => request<Tag>('/admin/tags', { method: 'POST', body: JSON.stringify(body) }),
  updateTag: (id: string, body: Partial<Tag>) =>
    request<Tag>(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTag: (id: string) => request<void>(`/admin/tags/${id}`, { method: 'DELETE' }),
  adminFriendLinks: () => request<FriendLink[]>('/admin/friend-links'),
  createFriendLink: (body: FriendLinkInput) =>
    request<FriendLink>('/admin/friend-links', { method: 'POST', body: JSON.stringify(body) }),
  updateFriendLink: (id: string, body: FriendLinkInput) =>
    request<FriendLink>(`/admin/friend-links/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFriendLink: (id: string) => request<void>(`/admin/friend-links/${id}`, { method: 'DELETE' }),
  comments: (status?: string) => request<Comment[]>('/admin/comments', {}, { status }),
  commentsPage: (query?: Query) => request<Paginated<Comment>>('/admin/comments', {}, { ...query, paged: 1 }),
  moderateComment: (id: string, status: Comment['status']) =>
    request<Comment>(`/admin/comments/${id}/moderate`, { method: 'PUT', body: JSON.stringify({ status }) }),
  replyComment: (id: string, content: string) =>
    request<Comment>(`/admin/comments/${id}/reply`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (id: string) => request<void>(`/admin/comments/${id}`, { method: 'DELETE' }),
  settings: () => request<SiteSettings>('/admin/settings'),
  updateSettings: (body: SiteSettings) => request<SiteSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  translationCachesPage: (query?: Query) => request<Paginated<TranslationCacheItem>>('/admin/translations', {}, query),
  deleteTranslationCache: (id: string) => request<void>(`/admin/translations/${id}`, { method: 'DELETE' }),
  backfillMissingTranslationCaches: () =>
    request<BackfillTranslationCachesResult>('/admin/translations/backfill', { method: 'POST' }),
  deleteStaleTranslationCaches: () =>
    request<DeleteTranslationCachesResult>('/admin/translations/stale', { method: 'DELETE' }),
  users: () => request<User[]>('/admin/users'),
  usersPage: (query?: Query) => request<Paginated<User>>('/admin/users', {}, { ...query, paged: 1 }),
  createUser: (body: UserInput) => request<User>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: UserInput) => request<User>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateUserPassword: (id: string, password: string) =>
    request<void>(`/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  activityLogs: (limit = 100) => request<ActivityLog[]>('/admin/activity-logs', {}, { limit }),
  activityLogsPage: (query?: Query) => request<Paginated<ActivityLog>>('/admin/activity-logs', {}, { ...query, paged: 1 }),
  deleteOldActivityLogs: (days: number) =>
    request<DeleteOldActivityLogsResult>('/admin/activity-logs/retention', { method: 'DELETE' }, { days }),
  media: () => request<MediaAsset[]>('/admin/media'),
  mediaPage: (query?: Query) => request<Paginated<MediaAsset>>('/admin/media', {}, { ...query, paged: 1 }),
  uploadMedia: (file: File, altText: string) => {
    const body = new FormData()
    body.append('file', file)
    body.append('altText', altText)
    return request<MediaAsset>('/admin/media', { method: 'POST', body })
  },
  updateMediaAltText: (id: string, altText: string) =>
    request<MediaAsset>(`/admin/media/${id}`, { method: 'PUT', body: JSON.stringify({ altText }) }),
  deleteMedia: (id: string) => request<void>(`/admin/media/${id}`, { method: 'DELETE' }),
  exportBackup: () => request<BackupSnapshot>('/admin/backup/export'),
  importBackup: (body: BackupSnapshot) => request<BackupImportResult>('/admin/backup/import', { method: 'POST', body: JSON.stringify(body) }),
}
