import { commentAuditItems, safeCommentWebsiteHref } from './commentAudit.js'
import type { Comment } from './types.js'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const baseComment: Comment = {
  id: 'comment-1',
  postId: 'post-1',
  postTitle: '文章',
  postSlug: 'hello',
  parentId: '',
  parentAuthorName: '',
  authorUserId: '',
  isAdminReply: false,
  authorName: '读者',
  email: 'reader@example.com',
  website: 'reader.example.com',
  content: '评论',
  status: 'pending',
  ipAddress: '203.0.113.8',
  userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
  createdAt: '2026-06-01T00:00:00Z',
}

const zhLabels = { email: '邮箱', website: '主页', ip: 'IP', userAgent: 'UA' }

assertEqual(safeCommentWebsiteHref('reader.example.com/blog'), 'https://reader.example.com/blog', 'normalizes bare website')
assertEqual(safeCommentWebsiteHref('https://reader.example.com'), 'https://reader.example.com', 'keeps https website')
assertEqual(safeCommentWebsiteHref('http://reader.example.com'), 'http://reader.example.com', 'keeps http website')
assertEqual(safeCommentWebsiteHref('javascript:alert(1)'), null, 'blocks javascript website')
assertEqual(safeCommentWebsiteHref('mailto:reader@example.com'), null, 'blocks mailto website')

const items = commentAuditItems(baseComment, zhLabels)
assertEqual(items.length, 4, 'shows email, website, ip and user agent')
assertEqual(items[0].label, '邮箱', 'email label')
assertEqual(items[1].href, 'https://reader.example.com', 'website href')
assertEqual(items[2].value, '203.0.113.8', 'ip value')
assertEqual(items[3].value, 'Mozilla/5.0 Chrome/120.0 Safari/537.36', 'user agent value')

const unsafeWebsiteItems = commentAuditItems({ ...baseComment, website: 'javascript:alert(1)', email: '', ipAddress: '', userAgent: '' }, zhLabels)
assertEqual(unsafeWebsiteItems.length, 1, 'keeps only unsafe website as text')
assertEqual(unsafeWebsiteItems[0].href, undefined, 'unsafe website has no href')
assertEqual(unsafeWebsiteItems[0].value, 'javascript:alert(1)', 'unsafe website text remains visible')

const englishItems = commentAuditItems(baseComment, { email: 'Email', website: 'Website', ip: 'IP', userAgent: 'UA' })
assertEqual(englishItems[0].label, 'Email', 'localized email label')
assertEqual(englishItems[1].label, 'Website', 'localized website label')
