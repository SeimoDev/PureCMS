import type { Comment } from './types'

export type CommentAuditItem = {
  label: string
  value: string
  href?: string
}

export type CommentAuditLabels = {
  email: string
  website: string
  ip: string
  userAgent: string
}

function hasScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value.trim())
}

export function safeCommentWebsiteHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('//')) return null
  const normalized = hasScheme(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(normalized)
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
      if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
        return `${parsed.protocol}//${parsed.host}`
      }
      return parsed.toString()
    }
  } catch {
    return null
  }
  return null
}

export function commentAuditItems(comment: Comment, labels: CommentAuditLabels): CommentAuditItem[] {
  const items: CommentAuditItem[] = []
  const email = comment.email.trim()
  const website = comment.website.trim()
  const ipAddress = comment.ipAddress.trim()
  const userAgent = comment.userAgent.trim()

  if (email) items.push({ label: labels.email, value: email })
  if (website) {
    const href = safeCommentWebsiteHref(website)
    items.push(href ? { label: labels.website, value: website, href } : { label: labels.website, value: website })
  }
  if (ipAddress) items.push({ label: labels.ip, value: ipAddress })
  if (userAgent) items.push({ label: labels.userAgent, value: userAgent })
  return items
}
