import { commentAuditItems } from './commentAudit.js'
import { commentsPageUIText } from './commentsPageI18n.js'
import { supportedLanguages } from './i18n.js'
import type { Comment } from './types.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const cjk = /[\u4E00-\u9FFF]/
const simplifiedFragments = ['评论审核', '批量审核', '垃圾评论', '站长回复', '发布回复', '暂无评论']

for (const language of supportedLanguages) {
  const text = commentsPageUIText(language.code)
  if (
    !text.title ||
    !text.searchPlaceholder ||
    !text.bulkTitle ||
    !text.replyDialogTitle ||
    !text.statusLabels.approved ||
    !text.statusLabels.pending ||
    !text.statusLabels.spam ||
    !text.auditLabels.email ||
    !text.emptyDescription
  ) {
    throw new Error(`missing comments page UI text for ${language.code}`)
  }

  const core = [
    text.title,
    text.subtitle,
    text.searchPlaceholder,
    text.bulkTitle,
    text.replyDialogTitle,
    text.statusLabels.approved,
    text.statusLabels.pending,
    text.statusLabels.spam,
    text.adminReply,
    text.publishReply,
    text.empty,
  ].join(' ')

  if (language.code !== 'zh-CN' && language.code !== 'zh-TW') {
    for (const fragment of simplifiedFragments) {
      if (core.includes(fragment)) {
        throw new Error(`comments page ${language.code} leaked Simplified Chinese fragment ${fragment}: ${core}`)
      }
    }
  }
  if (!['zh-CN', 'zh-TW', 'ja'].includes(language.code) && cjk.test(core)) {
    throw new Error(`comments page ${language.code} leaked CJK characters: ${core}`)
  }
}

assertEqual(commentsPageUIText('en').title, 'Comments', 'English title')
assertEqual(commentsPageUIText('ar').reply, 'رد', 'Arabic reply label')
assertEqual(commentsPageUIText('ja').statusLabels.pending, '承認待ち', 'Japanese status label')
assertEqual(commentsPageUIText('pt-BR').bulkApprove, 'Aprovar selecionados', 'Portuguese locale fallback')
assertEqual(commentsPageUIText('zh-Hant').publishReply, '發布回覆', 'Traditional Chinese locale fallback')

const comment: Comment = {
  id: 'comment-1',
  postId: 'post-1',
  postTitle: 'Post',
  postSlug: 'post',
  parentId: '',
  parentAuthorName: '',
  authorUserId: '',
  isAdminReply: false,
  authorName: 'Reader',
  email: 'reader@example.com',
  website: 'example.com',
  content: 'Nice',
  status: 'pending',
  ipAddress: '203.0.113.8',
  userAgent: 'Browser',
  createdAt: '2026-06-01T00:00:00Z',
}

const labels = commentsPageUIText('en').auditLabels
const auditItems = commentAuditItems(comment, labels)
assertEqual(auditItems[0].label, 'Email', 'localized audit email label')
assertEqual(auditItems[1].label, 'Website', 'localized audit website label')
