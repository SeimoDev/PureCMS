import { taxonomyDeleteDisabledReason, taxonomyReferenceCount, taxonomyUsageLabel, type TaxonomyUsageMessages } from './taxonomyUsage.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const englishMessages: TaxonomyUsageMessages = {
  unused: 'No linked content',
  content: (count) => `${count} posts`,
  deleteDisabled: (label, usage) => `This ${label} still links to ${usage}. Remove it from posts first.`,
}

assertEqual(String(taxonomyReferenceCount({ postCount: 2, referenceCount: 5 })), '5', 'uses admin reference count')
assertEqual(String(taxonomyReferenceCount({ postCount: 2 })), '2', 'falls back to public post count')
assertEqual(taxonomyUsageLabel({ postCount: 0, referenceCount: 0 }), '未关联内容', 'unused label')
assertEqual(taxonomyUsageLabel({ postCount: 1, referenceCount: 1 }), '1 篇内容', 'single content label')
assertEqual(taxonomyUsageLabel({ postCount: 2, referenceCount: 12500 }), '1.3万 篇内容', 'compact content label')
assertEqual(taxonomyUsageLabel({ postCount: 2, referenceCount: 12500 }, englishMessages, 'en'), '12.5K posts', 'localized compact content label')
assertEqual(taxonomyDeleteDisabledReason('分类', { postCount: 0, referenceCount: 0 }), '', 'unused taxonomy delete reason')
assertEqual(
  taxonomyDeleteDisabledReason('标签', { postCount: 2, referenceCount: 2 }),
  '该标签仍关联 2 篇内容，请先从文章中移除',
  'referenced taxonomy delete reason',
)
assertEqual(
  taxonomyDeleteDisabledReason('tag', { postCount: 2, referenceCount: 2 }, englishMessages, 'en'),
  'This tag still links to 2 posts. Remove it from posts first.',
  'localized referenced taxonomy delete reason',
)
