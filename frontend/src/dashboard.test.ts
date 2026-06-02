import { dashboardQuickActions, dashboardTasks, dashboardUIText } from './dashboard.js'
import { supportedLanguages } from './i18n.js'
import type { DashboardStats } from './types.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const activeStats: DashboardStats = {
  posts: 42,
  publishedPosts: 32,
  scheduledPosts: 2,
  featuredPosts: 4,
  draftPosts: 6,
  pendingComments: 3,
  approvedComments: 120,
  categories: 5,
  tags: 18,
  views: 28000,
  users: 4,
  mediaAssets: 25,
  activityLogs: 240,
}

const activeTasks = dashboardTasks(activeStats)

assertEqual(activeTasks.length, 6, 'task count')
assertEqual(activeTasks[0].key, 'pending-comments', 'pending comments first')
assertEqual(activeTasks[0].tone, 'urgent', 'pending comments are urgent')
assertEqual(activeTasks[0].href, '/admin/comments?status=pending', 'pending comments link')
assertEqual(activeTasks[0].count, 3, 'pending comments count')

const scheduledTask = activeTasks.find((task) => task.key === 'scheduled-posts')
assertEqual(scheduledTask?.tone, 'active', 'scheduled posts are active work')
assertEqual(scheduledTask?.href, '/admin/posts?scheduled=1', 'scheduled posts link')
assertEqual(scheduledTask?.count, 2, 'scheduled posts count')
assertEqual(scheduledTask?.description, '2 篇文章等待自动公开', 'scheduled posts description')

const draftTask = activeTasks.find((task) => task.key === 'draft-posts')
assertEqual(draftTask?.tone, 'active', 'drafts are active work')
assertEqual(draftTask?.href, '/admin/posts?status=draft', 'draft link')

const featuredTask = activeTasks.find((task) => task.key === 'featured-posts')
assertEqual(featuredTask?.tone, 'calm', 'featured posts are calm when curated')
assertEqual(featuredTask?.href, '/admin/posts?featured=1', 'featured link')
assertEqual(featuredTask?.count, 4, 'featured count')
assertEqual(featuredTask?.description, '4 篇文章在首页推荐位展示', 'featured description')

const structureTask = activeTasks.find((task) => task.key === 'content-structure')
assertEqual(structureTask?.count, 23, 'structure count combines categories and tags')
assertEqual(structureTask?.description, '已建立 5 个分类、18 个标签', 'structure description')

const emptyTasks = dashboardTasks({ ...activeStats, scheduledPosts: 0, featuredPosts: 0, draftPosts: 0, pendingComments: 0, categories: 0, tags: 0, mediaAssets: 0 })
assertEqual(emptyTasks[0].tone, 'calm', 'no pending comments is calm')
assertEqual(emptyTasks[1].description, '暂无排期文章', 'empty scheduled description')
assertEqual(emptyTasks[2].description, '没有未完成草稿', 'empty draft description')
assertEqual(emptyTasks[3].description, '尚未设置首页精选文章', 'empty featured description')
assertEqual(emptyTasks[3].tone, 'active', 'empty featured posts need attention')
assertEqual(emptyTasks[4].tone, 'active', 'empty taxonomy needs attention')
assertEqual(emptyTasks[5].description, '尚未上传媒体资源', 'empty media description')

const quickActions = dashboardQuickActions()
assertEqual(quickActions.length, 4, 'quick action count')
assertEqual(quickActions.map((action) => action.href).join(','), '/admin/posts/new,/admin/pages,/admin/media,/admin/comments', 'quick action order')

const englishText = dashboardUIText('en')
const englishTasks = dashboardTasks(activeStats, englishText)
assertEqual(englishText.title, 'Dashboard', 'English dashboard title')
assertEqual(englishTasks[0].description, '3 comments need review', 'English pending comments description')
assertEqual(dashboardQuickActions(englishText)[0].title, 'Write post', 'English quick action')

for (const language of supportedLanguages) {
  const text = dashboardUIText(language.code)
  if (!text.title || !text.metrics.posts || !text.tones.active || !text.quickActions.newPost.title) {
    throw new Error(`missing dashboard UI text for ${language.code}`)
  }
  const tasks = dashboardTasks(activeStats, text)
  if (tasks.length !== 6 || !tasks[0].title || !tasks[0].description || !tasks[0].action) {
    throw new Error(`missing dashboard task text for ${language.code}`)
  }
}
