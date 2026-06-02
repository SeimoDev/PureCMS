import { compactNumber } from './components/format.js'

type MediaReferenceTarget = {
  id?: string
  originalName?: string
  referenceCount: number
}

export type MediaUsageMessages = {
  unused: string
  referenced: (count: string) => string
  deleteDisabled: (usage: string) => string
  bulkDeleteBlocked: (count: number, names: string) => string
  nameSeparator: string
}

export const defaultMediaUsageMessages: MediaUsageMessages = {
  unused: '未引用',
  referenced: (count) => `${count} 处引用`,
  deleteDisabled: (usage) => `仍被 ${usage}，请先从文章或页面中移除`,
  bulkDeleteBlocked: (count, names) => `已选 ${count} 个媒体仍被内容引用：${names}。请先从文章或页面中移除后再删除。`,
  nameSeparator: '、',
}

export function mediaUsageLabel(referenceCount: number, messages: MediaUsageMessages = defaultMediaUsageMessages, languageCode?: string | null) {
  const count = Math.max(0, Math.trunc(Number.isFinite(referenceCount) ? referenceCount : 0))
  if (count === 0) return messages.unused
  return messages.referenced(compactNumber(count, languageCode))
}

export function mediaUsageTone(referenceCount: number) {
  return referenceCount > 0 ? 'warning' : 'default'
}

export function isMediaReferenced(asset: Pick<MediaReferenceTarget, 'referenceCount'>) {
  return asset.referenceCount > 0
}

export function mediaDeleteDisabledReason(
  asset: Pick<MediaReferenceTarget, 'referenceCount'>,
  messages: MediaUsageMessages = defaultMediaUsageMessages,
  languageCode?: string | null,
) {
  if (!isMediaReferenced(asset)) return ''
  return messages.deleteDisabled(mediaUsageLabel(asset.referenceCount, messages, languageCode))
}

export function bulkMediaDeleteBlockedMessage(
  assets: MediaReferenceTarget[],
  selectedIds: string[],
  messages: MediaUsageMessages = defaultMediaUsageMessages,
) {
  const selected = new Set(selectedIds)
  const referenced = assets.filter((asset) => asset.id && selected.has(asset.id) && isMediaReferenced(asset))
  if (referenced.length === 0) return ''
  const names = referenced
    .slice(0, 3)
    .map((asset) => asset.originalName?.trim() || asset.id)
    .join(messages.nameSeparator)
  return messages.bulkDeleteBlocked(referenced.length, names)
}
