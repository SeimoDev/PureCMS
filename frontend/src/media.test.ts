import {
  appendMarkdownBlock,
  imageUploadAccept,
  isImageMimeType,
  mediaKindLabel,
  mediaKindOptionItems,
  mediaKindOptions,
  mediaMarkdownImage,
  mediaUploadAccept,
} from './media.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(mediaKindLabel('image/png'), '图片', 'image kind label')
assertEqual(mediaKindLabel('application/pdf'), 'PDF', 'pdf kind label')
assertEqual(mediaKindLabel('text/markdown'), '文本', 'text kind label')
assertEqual(mediaKindLabel('application/octet-stream'), '附件', 'fallback kind label')
assertEqual(mediaKindLabel('image/png', { all: 'All', image: 'Image', pdf: 'PDF', text: 'Text', other: 'Attachment' }), 'Image', 'localized image kind label')
assertEqual(String(isImageMimeType(' image/jpeg ')), 'true', 'image mime type')
assertEqual(String(isImageMimeType('application/pdf')), 'false', 'non-image mime type')

const markdown = mediaMarkdownImage({
  originalName: '  封面 图.png ',
  altText: '  一张封面图  ',
  url: 'https://example.com/uploads/cover.png',
})
assertEqual(markdown, '![一张封面图](https://example.com/uploads/cover.png)', 'markdown image uses alt text')

const fallbackMarkdown = mediaMarkdownImage({
  originalName: '  封面 图.png ',
  altText: '',
  url: 'https://example.com/uploads/cover.png',
})
assertEqual(fallbackMarkdown, '![封面 图.png](https://example.com/uploads/cover.png)', 'markdown image falls back to filename')

assertEqual(appendMarkdownBlock('正文', markdown), '正文\n\n![一张封面图](https://example.com/uploads/cover.png)\n', 'append markdown block')
assertEqual(appendMarkdownBlock('正文\n\n', markdown), '正文\n\n![一张封面图](https://example.com/uploads/cover.png)\n', 'append trims trailing whitespace')

const optionValues = mediaKindOptions.map((option) => option.value).join(',')
assertEqual(optionValues, ',image,pdf,text,other', 'media kind option order')
const optionLabels = mediaKindOptionItems({ all: 'All', image: 'Image', pdf: 'PDF', text: 'Text', other: 'Attachment' })
  .map((option) => option.label)
  .join(',')
assertEqual(optionLabels, 'All,Image,PDF,Text,Attachment', 'localized media kind options')
assertEqual(imageUploadAccept.includes('image/svg+xml') ? 'true' : 'false', 'false', 'image upload rejects svg hint')
assertEqual(mediaUploadAccept.includes('text/html') ? 'true' : 'false', 'false', 'media upload rejects html hint')
assertEqual(mediaUploadAccept.includes('application/pdf') ? 'true' : 'false', 'true', 'media upload allows pdf hint')
