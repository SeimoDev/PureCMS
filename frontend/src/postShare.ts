import { toAbsoluteUrl } from './url'

export type PostShareInput = {
  title: string
  excerpt?: string
  url: string
  coverUrl?: string
}

export type ShareCopyAdapter = {
  clipboardWriteText?: (text: string) => Promise<void>
  legacyCopyText?: (text: string) => boolean
}

export type ShareCopyResult = 'copied' | 'manual'

function clean(value?: string) {
  return value?.trim() ?? ''
}

function withOptionalParam(url: URL, key: string, value?: string) {
  const cleaned = clean(value)
  if (cleaned) url.searchParams.set(key, cleaned)
}

function absoluteCoverUrl(input: PostShareInput) {
  return toAbsoluteUrl(input.coverUrl, input.url)
}

export function buildPostShareText(input: Pick<PostShareInput, 'excerpt' | 'title'>) {
  const title = clean(input.title)
  const excerpt = clean(input.excerpt)
  return excerpt ? `${title}：${excerpt}` : title
}

export function postShareCopyText(input: Pick<PostShareInput, 'title' | 'url'>) {
  return `${clean(input.title)}\n${clean(input.url)}`
}

export async function copyShareText(text: string, adapter: ShareCopyAdapter): Promise<ShareCopyResult> {
  if (adapter.clipboardWriteText) {
    try {
      await adapter.clipboardWriteText(text)
      return 'copied'
    } catch {
      // Try the DOM fallback below before asking the reader to copy manually.
    }
  }
  if (adapter.legacyCopyText?.(text)) {
    return 'copied'
  }
  return 'manual'
}

export function buildWeiboShareUrl(input: PostShareInput) {
  const url = new URL('https://service.weibo.com/share/share.php')
  url.searchParams.set('url', clean(input.url))
  url.searchParams.set('title', buildPostShareText(input))
  withOptionalParam(url, 'pic', absoluteCoverUrl(input))
  return url.toString()
}

export function buildQzoneShareUrl(input: PostShareInput) {
  const url = new URL('https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey')
  url.searchParams.set('url', clean(input.url))
  url.searchParams.set('title', clean(input.title))
  withOptionalParam(url, 'summary', input.excerpt)
  withOptionalParam(url, 'pics', absoluteCoverUrl(input))
  return url.toString()
}
