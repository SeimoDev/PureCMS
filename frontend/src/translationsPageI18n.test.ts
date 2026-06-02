import { supportedLanguages } from './i18n.js'
import { translationBackfillNotice, translationCacheDeletePrompt, translationCacheStatus } from './translationCache.js'
import { translationsPageUIText } from './translationsPageI18n.js'
import type { TranslationCacheItem } from './types.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const cjk = /[\u4E00-\u9FFF]/
const simplifiedFragments = ['翻译缓存', '补齐缺失翻译', '清理过期缓存', '目标语言', '源语言', '暂无翻译缓存']

const item: TranslationCacheItem = {
  id: 'cache-1',
  postId: 'post-1',
  postTitle: '文章一',
  postSlug: 'post-one',
  postStatus: 'published',
  languageCode: 'en',
  sourceLanguage: 'zh-CN',
  sourceHash: 'hash-1',
  stale: false,
  segmentCount: 2,
  contentBytes: 512,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-02T00:00:00Z',
}

for (const language of supportedLanguages) {
  const text = translationsPageUIText(language.code)
  if (
    !text.title ||
    !text.backfillButton ||
    !text.cleanButton ||
    !text.targetLanguage ||
    !text.sourceLanguage ||
    !text.tableActions ||
    !text.statusLabels.published ||
    !text.cache.freshStatus ||
    !text.cache.staleStatus
  ) {
    throw new Error(`missing translations page UI text for ${language.code}`)
  }

  const core = [
    text.title,
    text.subtitle,
    text.cleanConfirm,
    text.backfillButton,
    text.cleanButton,
    text.targetLanguage,
    text.sourceLanguage,
    text.emptyTitle,
    text.tableActions,
    text.cache.freshStatus,
    text.cache.staleStatus,
  ].join(' ')

  if (language.code !== 'zh-CN' && language.code !== 'zh-TW') {
    for (const fragment of simplifiedFragments) {
      if (core.includes(fragment)) {
        throw new Error(`translations page ${language.code} leaked Simplified Chinese fragment ${fragment}: ${core}`)
      }
    }
  }
  if (!['zh-CN', 'zh-TW', 'ja'].includes(language.code) && cjk.test(core)) {
    throw new Error(`translations page ${language.code} leaked CJK characters: ${core}`)
  }
}

assertEqual(translationsPageUIText('en').title, 'Translations', 'English title')
assertEqual(translationsPageUIText('ar').title, 'الترجمات', 'Arabic title')
assertEqual(translationsPageUIText('ja').cleanButton, '期限切れキャッシュをクリーンアップ', 'Japanese cleanup label')
assertEqual(translationsPageUIText('pt-BR').backfillButton, 'Completar traduções', 'Portuguese locale fallback')
assertEqual(translationsPageUIText('zh-Hant').cache.staleStatus, '需清理', 'Traditional Chinese locale fallback')

const english = translationsPageUIText('en').cache
assertEqual(translationCacheStatus(item, english).label, 'Reusable', 'localized fresh cache status')
assertEqual(
  translationCacheStatus({ ...item, hasCache: false, jobStatus: 'running' }, english).label,
  'Translating',
  'localized running cache status',
)
assertEqual(translationCacheStatus({ ...item, jobStatus: 'failed' }, english).label, 'Failed', 'localized failed cache status')
assertEqual(translationCacheDeletePrompt(item, english), 'Delete the en translation cache for "文章一"?', 'localized delete prompt')
assertEqual(
  translationBackfillNotice({ scannedPosts: 4, queuedPosts: 2, queuedTargets: 7 }, english),
  'Scanned 4 published posts. Queued 2 posts and 7 language translations.',
  'localized backfill notice',
)
