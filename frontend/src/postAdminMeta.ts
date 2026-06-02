import { compactNumber } from './components/format'
import type { Post } from './types'

export type PostAdminMetaText = {
  fallbackAuthor: string
  views: string
  comments: string
  locale?: string
}

const defaultPostAdminMetaText: PostAdminMetaText = {
  fallbackAuthor: '站长',
  views: '浏览',
  comments: '评论',
  locale: 'zh-CN',
}

export function postAuthorLabel(post: Pick<Post, 'authorName'>, text: PostAdminMetaText = defaultPostAdminMetaText) {
  return post.authorName.trim() || text.fallbackAuthor
}

export function postEngagementLabel(post: Pick<Post, 'viewCount' | 'commentCount'>, text: PostAdminMetaText = defaultPostAdminMetaText) {
  return `${compactNumber(post.viewCount, text.locale)} ${text.views} · ${compactNumber(post.commentCount, text.locale)} ${text.comments}`
}
