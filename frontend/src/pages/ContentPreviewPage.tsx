import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { articleReadingStats, formatReadingMinutes, formatTextUnitCount } from '../articleMetrics'
import { extractArticleHeadings } from '../articleRenderer'
import ArticleRenderer from '../components/ArticleRenderer'
import ArticleToc from '../components/ArticleToc'
import { formatDateTime } from '../components/format'
import LoadingState from '../components/LoadingState'
import { contentPreviewUIText, type ContentPreviewUIText } from '../contentPreviewI18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import type { Page, Post } from '../types'

type PreviewKind = 'posts' | 'pages'

export default function ContentPreviewPage() {
  const { kind, id } = useParams()
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => contentPreviewUIText(adminLanguage), [adminLanguage])
  const [post, setPost] = useState<Post | null>(null)
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || (kind !== 'posts' && kind !== 'pages')) {
      setError(text.invalidAddress)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const load = kind === 'posts' ? api.adminPost(id).then(setPost) : api.adminPage(id).then(setPage)
    load.catch((err) => setError(apiErrorMessage(err, text.loadError))).finally(() => setLoading(false))
  }, [id, kind, text.invalidAddress, text.loadError])

  if (loading) return <LoadingState label={text.loading} />
  if (error) return <Alert severity="error">{error}</Alert>
  if (kind === 'posts' && post) return <PostPreview post={post} text={text} languageCode={adminLanguage} />
  if (kind === 'pages' && page) return <PagePreview page={page} text={text} />
  return <Alert severity="warning">{text.missing}</Alert>
}

function statusColor(status: Post['status'] | Page['status']) {
  return status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'default'
}

function PreviewShell({
  kind,
  title,
  slug,
  status,
  editTo,
  publicTo,
  text,
  children,
}: {
  kind: PreviewKind
  title: string
  slug: string
  status: Post['status'] | Page['status']
  editTo: string
  publicTo: string
  text: ContentPreviewUIText
  children: ReactNode
}) {
  const publicEnabled = status === 'published'
  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip icon={<Eye size={14} />} label={text.previewBadge} color="primary" variant="outlined" />
            <Chip label={text.statusLabels[status]} color={statusColor(status)} />
          </Stack>
          <Typography variant="h4" sx={{ mt: 1 }}>
            {title}
          </Typography>
          <Typography color="text.secondary">/{kind === 'posts' ? 'posts' : 'pages'}/{slug}</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} to={editTo} startIcon={<ArrowLeft size={18} />} color="inherit">
            {text.backToEdit}
          </Button>
          <Button component={Link} to={publicTo} target="_blank" startIcon={<ExternalLink size={18} />} disabled={!publicEnabled}>
            {text.publicPage}
          </Button>
        </Stack>
      </Stack>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>{children}</CardContent>
      </Card>
    </Stack>
  )
}

function PostPreview({ post, text, languageCode }: { post: Post; text: ContentPreviewUIText; languageCode: string }) {
  const readingStats = articleReadingStats(post.content)
  const articleHeadings = extractArticleHeadings(post.content)

  return (
    <PreviewShell kind="posts" title={post.title} slug={post.slug} status={post.status} editTo={`/admin/posts/${post.id}`} publicTo={`/posts/${post.slug}`} text={text}>
      <Stack gap={4}>
        <Stack gap={2}>
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            {post.categories.map((category) => (
              <Chip key={category.id} size="small" label={category.name} color="primary" variant="outlined" />
            ))}
            {post.tags.map((tag) => (
              <Chip key={tag.id} size="small" label={`# ${tag.name}`} variant="outlined" />
            ))}
          </Stack>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 56 }, maxWidth: 920 }}>
            {post.title}
          </Typography>
          {post.excerpt && (
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.8 }}>
              {post.excerpt}
            </Typography>
          )}
          <Stack direction="row" gap={2} color="text.secondary" flexWrap="wrap" useFlexGap>
            <Typography variant="body2">{post.authorName || text.fallbackAuthor}</Typography>
            <Typography variant="body2">{formatDateTime(post.publishedAt, languageCode)}</Typography>
            <Typography variant="body2">{formatTextUnitCount(readingStats.textUnits, text.metrics)}</Typography>
            <Typography variant="body2">{formatReadingMinutes(readingStats.readingMinutes, text.metrics)}</Typography>
          </Stack>
        </Stack>
        {post.coverUrl && (
          <Box
            sx={{
              height: { xs: 220, md: 360 },
              borderRadius: 2,
              background: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.18)), url(${post.coverUrl}) center/cover`,
            }}
          />
        )}
        {articleHeadings.length > 1 && (
          <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
            <ArticleToc headings={articleHeadings} title={text.tocTitle} navLabel={text.tocNavLabel} />
          </Box>
        )}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 3, lg: 4 },
            gridTemplateColumns: { xs: '1fr', lg: articleHeadings.length > 1 ? 'minmax(0, 1fr) 260px' : '1fr' },
            alignItems: 'start',
          }}
        >
          <ArticleRenderer content={post.content} />
          {articleHeadings.length > 1 && (
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <ArticleToc headings={articleHeadings} title={text.tocTitle} navLabel={text.tocNavLabel} sticky />
            </Box>
          )}
        </Box>
      </Stack>
    </PreviewShell>
  )
}

function PagePreview({ page, text }: { page: Page; text: ContentPreviewUIText }) {
  const readingStats = articleReadingStats(page.content)
  const articleHeadings = extractArticleHeadings(page.content)

  return (
    <PreviewShell kind="pages" title={page.title} slug={page.slug} status={page.status} editTo="/admin/pages" publicTo={`/pages/${page.slug}`} text={text}>
      <Stack gap={3}>
        <Stack gap={2}>
          <Chip label={text.customPage} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 56 }, maxWidth: 920 }}>
            {page.title}
          </Typography>
          {page.seoDescription && (
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.8 }}>
              {page.seoDescription}
            </Typography>
          )}
          <Stack direction="row" gap={2} color="text.secondary" flexWrap="wrap" useFlexGap>
            <Typography variant="body2">{formatTextUnitCount(readingStats.textUnits, text.metrics)}</Typography>
            <Typography variant="body2">{formatReadingMinutes(readingStats.readingMinutes, text.metrics)}</Typography>
          </Stack>
        </Stack>
        {articleHeadings.length > 1 && (
          <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
            <ArticleToc headings={articleHeadings} title={text.tocTitle} navLabel={text.tocNavLabel} />
          </Box>
        )}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 3, lg: 4 },
            gridTemplateColumns: { xs: '1fr', lg: articleHeadings.length > 1 ? 'minmax(0, 1fr) 260px' : '1fr' },
            alignItems: 'start',
          }}
        >
          <ArticleRenderer content={page.content} />
          {articleHeadings.length > 1 && (
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <ArticleToc headings={articleHeadings} title={text.tocTitle} navLabel={text.tocNavLabel} sticky />
            </Box>
          )}
        </Box>
      </Stack>
    </PreviewShell>
  )
}
