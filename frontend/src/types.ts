export type Category = {
  id: string
  name: string
  slug: string
  description: string
  sortOrder: number
  postCount: number
  referenceCount: number
  createdAt: string
}

export type Tag = {
  id: string
  name: string
  slug: string
  postCount: number
  referenceCount: number
  createdAt: string
}

export type Post = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  sourceLanguage: string
  coverUrl: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  seoTitle: string
  seoDescription: string
  authorId: string
  authorName: string
  viewCount: number
  commentCount: number
  categories: Category[]
  tags: Tag[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type Paginated<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type PostInput = {
  title: string
  slug: string
  excerpt: string
  content: string
  sourceLanguage: string
  coverUrl: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  seoTitle: string
  seoDescription: string
  categoryIds: string[]
  tagIds: string[]
  publishedAt?: string | null
}

export type ArchivePost = {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  viewCount: number
  commentCount: number
}

export type ArchiveMonth = {
  month: number
  postCount: number
  posts: ArchivePost[]
}

export type ArchiveYear = {
  year: number
  postCount: number
  months: ArchiveMonth[]
}

export type Page = {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published' | 'archived'
  showInNav: boolean
  navLabel: string
  sortOrder: number
  seoTitle: string
  seoDescription: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type PageInput = {
  title: string
  slug: string
  content: string
  status: 'draft' | 'published' | 'archived'
  showInNav: boolean
  navLabel: string
  sortOrder: number
  seoTitle: string
  seoDescription: string
}

export type PageRevision = {
  id: string
  pageId: string
  versionNumber: number
  title: string
  slug: string
  content: string
  status: 'draft' | 'published' | 'archived'
  showInNav: boolean
  navLabel: string
  sortOrder: number
  seoTitle: string
  seoDescription: string
  createdBy: string
  createdAt: string
}

export type PostRevision = {
  id: string
  postId: string
  versionNumber: number
  title: string
  slug: string
  excerpt: string
  content: string
  sourceLanguage: string
  coverUrl: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  seoTitle: string
  seoDescription: string
  categoryIds: string[]
  tagIds: string[]
  publishedAt: string | null
  createdBy: string
  createdAt: string
}

export type Comment = {
  id: string
  postId: string
  postTitle: string
  postSlug: string
  parentId: string
  parentAuthorName: string
  authorUserId: string
  isAdminReply: boolean
  authorName: string
  email: string
  website: string
  content: string
  status: 'pending' | 'approved' | 'spam'
  ipAddress: string
  userAgent: string
  createdAt: string
}

export type DashboardStats = {
  posts: number
  publishedPosts: number
  scheduledPosts: number
  featuredPosts: number
  draftPosts: number
  pendingComments: number
  approvedComments: number
  categories: number
  tags: number
  views: number
  users: number
  mediaAssets: number
  activityLogs: number
}

export type DailyView = {
  date: string
  views: number
}

export type PopularPost = {
  id: string
  title: string
  slug: string
  views: number
}

export type AnalyticsSummary = {
  totalViews: number
  todayViews: number
  dailyViews: DailyView[]
  popularPosts: PopularPost[]
}

export type User = {
  id: string
  username: string
  displayName: string
  role: string
  status: 'active' | 'disabled'
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export type UserInput = {
  username: string
  displayName: string
  password?: string
  role: 'admin' | 'editor'
  status: 'active' | 'disabled'
}

export type BackupUser = User & {
  passwordHash?: string
}

export type AccountProfileInput = {
  displayName: string
}

export type AccountPasswordInput = {
  currentPassword: string
  newPassword: string
}

export type SiteSettings = {
  site?: {
    title?: string
    subtitle?: string
    icp?: string
    icpUrl?: string
    policeRecord?: string
    policeRecordUrl?: string
    logoText?: string
    wechat?: string
    email?: string
  }
  seo?: {
    keywords?: string
    description?: string
    baiduSiteVerification?: string
    googleSiteVerification?: string
    bingSiteVerification?: string
    so360SiteVerification?: string
    sogouSiteVerification?: string
  }
  comment?: {
    enabled?: boolean
    moderation?: boolean
    notice?: string
    spamKeywords?: string[]
    rateLimitWindowMinutes?: number
    rateLimitMax?: number
  }
  appearance?: {
    themeMode?: string
    accentColor?: string
    homeLayout?: string
    coverStyle?: string
  }
  translation?: {
    enabled?: boolean
    provider?: string
    endpoint?: string
    model?: string
    apiKey?: string
    timeoutSeconds?: number
  }
  maintenance?: {
    enabled?: boolean
    message?: string
  }
}

export type PostTranslationSegment = {
  index: number
  sourceText: string
  translatedText: string
}

export type PostTranslation = {
  id?: string
  postId: string
  languageCode: string
  sourceLanguage: string
  sourceHash: string
  title: string
  excerpt: string
  content: string
  segments: PostTranslationSegment[]
  fromCache?: boolean
  createdAt?: string
  updatedAt?: string
}

export type PostTranslationJob = {
  id?: string
  postId: string
  languageCode: string
  sourceLanguage: string
  sourceHash: string
  status: 'running' | 'succeeded' | 'failed'
  errorMessage: string
  startedAt?: string | null
  finishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type TranslationCacheItem = {
  id: string
  cacheId?: string
  jobId?: string
  postId: string
  postTitle: string
  postSlug: string
  postStatus: Post['status']
  languageCode: string
  sourceLanguage: string
  sourceHash: string
  hasCache?: boolean
  stale: boolean
  segmentCount: number
  contentBytes: number
  jobStatus?: 'running' | 'succeeded' | 'failed'
  jobError?: string
  jobStartedAt?: string | null
  jobFinishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type DeleteTranslationCachesResult = {
  deleted: number
}

export type BackfillTranslationCachesResult = {
  scannedPosts: number
  queuedPosts: number
  queuedTargets: number
}

export type DeleteOldActivityLogsResult = {
  deleted: number
  retentionDays: number
  before: string
}

export type SystemDatabaseStatus = {
  status: string
  latencyMs: number
  totalConns: number
  acquiredConns: number
  idleConns: number
}

export type SystemStorageStatus = {
  status: string
  uploadDir: string
  exists: boolean
  writable: boolean
  fileCount: number
  totalBytes: number
}

export type SystemContentStats = {
  posts: number
  trashedPosts: number
  pages: number
  trashedPages: number
  mediaAssets: number
  comments: number
  users: number
  activityLogs: number
  translationCaches: number
  staleTranslationCaches: number
  translationJobs: number
  runningTranslationJobs: number
  failedTranslationJobs: number
}

export type SystemTranslationStatus = {
  enabled: boolean
  provider: string
  model: string
  apiKeyConfigured: boolean
  cacheCount: number
  staleCacheCount: number
  jobCount: number
  runningJobCount: number
  failedJobCount: number
  supportedLanguages: { code: string; flag: string; nativeName: string; rtl?: boolean }[]
}

export type SystemRuntimeStatus = {
  goVersion: string
  os: string
  arch: string
  processId: number
  startedAt: string
  uptimeSeconds: number
}

export type SystemDeploymentCheck = {
  key: string
  label: string
  ok: boolean
  severity: string
  detail: string
}

export type SystemDeploymentStatus = {
  status: string
  checks: SystemDeploymentCheck[]
}

export type SystemStatus = {
  generatedAt: string
  database: SystemDatabaseStatus
  storage: SystemStorageStatus
  content: SystemContentStats
  translation: SystemTranslationStatus
  runtime: SystemRuntimeStatus
  deployment: SystemDeploymentStatus
}

export type AuthResponse = {
  token: string
  expiresAt: string
  user: User
}

export type ActivityLog = {
  id: string
  actorId: string
  actorUsername: string
  action: string
  entityType: string
  entityId: string
  detail: Record<string, unknown>
  ipAddress: string
  userAgent: string
  createdAt: string
}

export type MediaAsset = {
  id: string
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  url: string
  altText: string
  uploadedBy: string
  referenceCount: number
  contentBase64?: string
  createdAt: string
}

export type FriendLink = {
  id: string
  name: string
  url: string
  description: string
  logoUrl: string
  status: 'active' | 'hidden'
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type FriendLinkInput = {
  name: string
  url: string
  description: string
  logoUrl: string
  status: 'active' | 'hidden'
  sortOrder: number
}

export type PostViewStat = {
  day: string
  postId: string
  postTitle: string
  postSlug: string
  views: number
}

export type BackupSnapshot = {
  exportedAt: string
  settings: SiteSettings
  users: BackupUser[]
  posts: Post[]
  pages: Page[]
  categories: Category[]
  tags: Tag[]
  comments: Comment[]
  mediaAssets: MediaAsset[]
  activityLogs: ActivityLog[]
  postRevisions: PostRevision[]
  pageRevisions: PageRevision[]
  postTranslations?: PostTranslation[]
  postTranslationJobs?: PostTranslationJob[]
  friendLinks: FriendLink[]
  viewStats?: PostViewStat[]
}

export type BackupImportResult = {
  settings: number
  users: number
  categories: number
  tags: number
  posts: number
  pages: number
  comments: number
  mediaAssets: number
  postRevisions: number
  pageRevisions: number
  postTranslations: number
  postTranslationJobs: number
  friendLinks: number
  viewStats: number
  activityLogs: number
}
