import { translationBackfillNotice, translationCacheDeletePrompt, translationCacheStatus, translationCacheSummary } from './translationCache.js'
import type { TranslationCacheItem } from './types.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const items = [
  {
    id: 'cache-1',
    postId: 'post-1',
    postTitle: '文章一',
    postSlug: 'post-one',
    postStatus: 'published',
    languageCode: 'en',
    sourceLanguage: 'zh-CN',
    sourceHash: 'hash-1',
    stale: false,
    segmentCount: 3,
    contentBytes: 600,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'cache-2',
    postId: 'post-2',
    postTitle: '文章二',
    postSlug: 'post-two',
    postStatus: 'draft',
    languageCode: 'ja',
    sourceLanguage: 'zh-CN',
    sourceHash: 'hash-2',
    stale: true,
    segmentCount: 2,
    contentBytes: 300,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
  },
] satisfies TranslationCacheItem[]

const summary = translationCacheSummary(items)
assertEqual(summary.total, 2, 'total cache count')
assertEqual(summary.stale, 1, 'stale cache count')
assertEqual(summary.segments, 5, 'segment count')
assertEqual(summary.bytes, 900, 'content bytes')
assertEqual(summary.languages, 'en / ja', 'language list')

const statusMessages = {
  noLanguages: 'None',
  freshStatus: 'Reusable',
  staleStatus: 'Stale',
  runningStatus: 'Translating',
  failedStatus: 'Failed',
  deletePrompt: (postTitle: string, languageCode: string) => `${postTitle}:${languageCode}`,
  backfillEmpty: (scannedPosts: number) => `${scannedPosts}`,
  backfillQueued: (scannedPosts: number, queuedPosts: number, queuedTargets: number) => `${scannedPosts}:${queuedPosts}:${queuedTargets}`,
}

assertEqual(
  translationCacheStatus({ ...items[0], hasCache: false, jobStatus: 'running' }, statusMessages).label,
  'Translating',
  'running status label',
)
assertEqual(translationCacheStatus({ ...items[0], jobStatus: 'failed' }, statusMessages).label, 'Failed', 'failed status label')

assertEqual(translationCacheStatus(items[0]).label, '可复用', 'fresh status label')
assertEqual(translationCacheStatus(items[1]).label, '需清理', 'stale status label')
assertEqual(translationCacheDeletePrompt(items[0]), '确认删除《文章一》的 en 翻译缓存？', 'delete prompt')
assertEqual(translationBackfillNotice({ scannedPosts: 4, queuedPosts: 0, queuedTargets: 0 }), '已扫描 4 篇已发布文章，没有发现缺失翻译。', 'empty backfill notice')
assertEqual(
  translationBackfillNotice({ scannedPosts: 4, queuedPosts: 2, queuedTargets: 7 }),
  '已扫描 4 篇已发布文章，已排队 2 篇文章、7 个语言翻译。',
  'queued backfill notice',
)
