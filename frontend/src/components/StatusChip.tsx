import { Chip } from '@mui/material'
import type { Comment, Post } from '../types'

export type PostStatusChipLabels = Record<Post['status'], string>
export type CommentStatusChipLabels = Record<Comment['status'], string>

export function PostStatusChip({ status, labels }: { status: Post['status']; labels: PostStatusChipLabels }) {
  const config = {
    published: { label: labels.published, color: 'success' as const },
    draft: { label: labels.draft, color: 'warning' as const },
    archived: { label: labels.archived, color: 'default' as const },
  }[status]
  return <Chip size="small" label={config.label} color={config.color} />
}

export function CommentStatusChip({ status, labels }: { status: Comment['status']; labels: CommentStatusChipLabels }) {
  const config = {
    approved: { label: labels.approved, color: 'success' as const },
    pending: { label: labels.pending, color: 'warning' as const },
    spam: { label: labels.spam, color: 'error' as const },
  }[status]
  return <Chip size="small" label={config.label} color={config.color} />
}
