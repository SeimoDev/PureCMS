import type { BackfillTranslationCachesResult, TranslationCacheItem } from './types'

export type TranslationCacheMessages = {
  noLanguages: string
  freshStatus: string
  staleStatus: string
  runningStatus?: string
  failedStatus?: string
  deletePrompt: (postTitle: string, languageCode: string) => string
  backfillEmpty: (scannedPosts: number) => string
  backfillQueued: (scannedPosts: number, queuedPosts: number, queuedTargets: number) => string
}

const defaultMessages: TranslationCacheMessages = {
  noLanguages: '无',
  freshStatus: '可复用',
  staleStatus: '需清理',
  runningStatus: '翻译中',
  failedStatus: '翻译失败',
  deletePrompt: (postTitle, languageCode) => `确认删除《${postTitle}》的 ${languageCode} 翻译缓存？`,
  backfillEmpty: (scannedPosts) => `已扫描 ${scannedPosts} 篇已发布文章，没有发现缺失翻译。`,
  backfillQueued: (scannedPosts, queuedPosts, queuedTargets) =>
    `已扫描 ${scannedPosts} 篇已发布文章，已排队 ${queuedPosts} 篇文章、${queuedTargets} 个语言翻译。`,
}

export function translationCacheSummary(items: TranslationCacheItem[], messages: Pick<TranslationCacheMessages, 'noLanguages'> = defaultMessages) {
  const languages = Array.from(new Set(items.map((item) => item.languageCode))).join(' / ') || messages.noLanguages
  return {
    total: items.length,
    stale: items.filter((item) => item.stale).length,
    segments: items.reduce((sum, item) => sum + item.segmentCount, 0),
    bytes: items.reduce((sum, item) => sum + item.contentBytes, 0),
    languages,
  }
}

export function translationCacheStatus(item: TranslationCacheItem, messages: TranslationCacheMessages = defaultMessages) {
  if (item.stale) {
    return { label: messages.staleStatus, color: 'warning' as const }
  }
  if (item.jobStatus === 'failed') {
    return { label: messages.failedStatus ?? defaultMessages.failedStatus ?? 'Failed', color: 'error' as const }
  }
  if (item.jobStatus === 'running' && item.hasCache === false) {
    return { label: messages.runningStatus ?? defaultMessages.runningStatus ?? 'Running', color: 'info' as const }
  }
  return { label: messages.freshStatus, color: 'success' as const }
}

export function translationCacheDeletePrompt(item: TranslationCacheItem, messages: TranslationCacheMessages = defaultMessages) {
  return messages.deletePrompt(item.postTitle, item.languageCode)
}

export function translationBackfillNotice(result: BackfillTranslationCachesResult, messages: TranslationCacheMessages = defaultMessages) {
  if (result.queuedTargets === 0) {
    return messages.backfillEmpty(result.scannedPosts)
  }
  return messages.backfillQueued(result.scannedPosts, result.queuedPosts, result.queuedTargets)
}
