export type MediaKindValue = '' | 'image' | 'pdf' | 'text' | 'other'

export type MediaKindLabels = {
  all: string
  image: string
  pdf: string
  text: string
  other: string
}

export const defaultMediaKindLabels: MediaKindLabels = {
  all: '全部类型',
  image: '图片',
  pdf: 'PDF',
  text: '文本',
  other: '附件',
}

export const imageUploadAccept = 'image/png,image/jpeg,image/gif,image/webp'
export const mediaUploadAccept = `${imageUploadAccept},application/pdf,text/plain,text/markdown,.txt,.md,.markdown`

export const mediaKindOptions: Array<{ value: MediaKindValue; label: string }> = mediaKindOptionItems()

export function mediaKindOptionItems(labels: MediaKindLabels = defaultMediaKindLabels): Array<{ value: MediaKindValue; label: string }> {
  return [
    { value: '', label: labels.all },
    { value: 'image', label: labels.image },
    { value: 'pdf', label: labels.pdf },
    { value: 'text', label: labels.text },
    { value: 'other', label: labels.other },
  ]
}

export function mediaKindLabel(mimeType: string, labels: MediaKindLabels = defaultMediaKindLabels) {
  const normalized = mimeType.trim().toLowerCase()
  if (normalized.startsWith('image/')) return labels.image
  if (normalized === 'application/pdf') return labels.pdf
  if (normalized.startsWith('text/')) return labels.text
  return labels.other
}

export function isImageMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase().startsWith('image/')
}

export function mediaMarkdownImage(asset: { originalName: string; altText: string; url: string }) {
  const label = asset.altText.trim() || asset.originalName.trim() || 'image'
  return `![${label}](${asset.url})`
}

export function appendMarkdownBlock(content: string, block: string) {
  return `${content.trimEnd()}\n\n${block}\n`
}
