import {
  bulkMediaDeleteBlockedMessage,
  isMediaReferenced,
  mediaDeleteDisabledReason,
  mediaUsageLabel,
  mediaUsageTone,
  type MediaUsageMessages,
} from './mediaUsage.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const englishMessages: MediaUsageMessages = {
  unused: 'Unused',
  referenced: (count) => `${count} references`,
  deleteDisabled: (usage) => `Still has ${usage}. Remove it from posts or pages first.`,
  bulkDeleteBlocked: (count, names) => `${count} selected media files are still referenced: ${names}.`,
  nameSeparator: ', ',
}

assertEqual(mediaUsageLabel(0), '未引用', 'unused media label')
assertEqual(mediaUsageLabel(2), '2 处引用', 'referenced media label')
assertEqual(mediaUsageLabel(12500), '1.3万 处引用', 'compact referenced media label')
assertEqual(mediaUsageLabel(-1), '未引用', 'negative reference count label')
assertEqual(mediaUsageLabel(2, englishMessages, 'en'), '2 references', 'localized referenced media label')
assertEqual(mediaUsageTone(0), 'default', 'unused media tone')
assertEqual(mediaUsageTone(1), 'warning', 'referenced media tone')
assertEqual(String(isMediaReferenced({ referenceCount: 0 })), 'false', 'unused media can be deleted')
assertEqual(String(isMediaReferenced({ referenceCount: 1 })), 'true', 'referenced media is protected')
assertEqual(mediaDeleteDisabledReason({ referenceCount: 2 }), '仍被 2 处引用，请先从文章或页面中移除', 'referenced media delete reason')
assertEqual(mediaDeleteDisabledReason({ referenceCount: 2 }, englishMessages, 'en'), 'Still has 2 references. Remove it from posts or pages first.', 'localized media delete reason')
assertEqual(mediaDeleteDisabledReason({ referenceCount: 0 }), '', 'unused media delete reason')

const assets = [
  { id: 'unused', originalName: 'unused.png', referenceCount: 0 },
  { id: 'cover', originalName: 'cover.png', referenceCount: 1 },
  { id: 'body', originalName: 'body.png', referenceCount: 3 },
]
assertEqual(
  bulkMediaDeleteBlockedMessage(assets, ['unused']),
  '',
  'bulk delete allows unused assets',
)
assertEqual(
  bulkMediaDeleteBlockedMessage(assets, ['unused', 'cover', 'body']),
  '已选 2 个媒体仍被内容引用：cover.png、body.png。请先从文章或页面中移除后再删除。',
  'bulk delete blocks referenced assets',
)
assertEqual(
  bulkMediaDeleteBlockedMessage(assets, ['unused', 'cover', 'body'], englishMessages),
  '2 selected media files are still referenced: cover.png, body.png.',
  'localized bulk delete blocks referenced assets',
)
