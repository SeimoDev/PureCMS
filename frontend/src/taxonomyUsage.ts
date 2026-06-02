import { compactNumber } from './components/format.js'

type TaxonomyUsageTarget = {
  postCount: number
  referenceCount?: number
}

export type TaxonomyUsageMessages = {
  unused: string
  content: (count: string) => string
  deleteDisabled: (label: string, usage: string) => string
}

export const defaultTaxonomyUsageMessages: TaxonomyUsageMessages = {
  unused: '未关联内容',
  content: (count) => `${count} 篇内容`,
  deleteDisabled: (label, usage) => `该${label}仍关联 ${usage}，请先从文章中移除`,
}

export function taxonomyReferenceCount(item: TaxonomyUsageTarget) {
  const value = item.referenceCount ?? item.postCount
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0))
}

export function taxonomyUsageLabel(item: TaxonomyUsageTarget, messages: TaxonomyUsageMessages = defaultTaxonomyUsageMessages, languageCode?: string | null) {
  const count = taxonomyReferenceCount(item)
  if (count === 0) return messages.unused
  return messages.content(compactNumber(count, languageCode))
}

export function taxonomyDeleteDisabledReason(
  label: string,
  item: TaxonomyUsageTarget,
  messages: TaxonomyUsageMessages = defaultTaxonomyUsageMessages,
  languageCode?: string | null,
) {
  const count = taxonomyReferenceCount(item)
  if (count === 0) return ''
  return messages.deleteDisabled(label, taxonomyUsageLabel(item, messages, languageCode))
}
