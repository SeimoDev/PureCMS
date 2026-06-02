import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Skeleton,
  Tooltip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Copy, Eye, Languages, MessageCircle, Reply, Send, Share2 } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { articleMetricText, articleReadingStats, formatReadingMinutes, formatTextUnitCount } from '../articleMetrics'
import { extractArticleHeadings } from '../articleRenderer'
import { buildCommentTree, type CommentNode } from '../comments'
import ArticleRenderer from '../components/ArticleRenderer'
import ArticleToc from '../components/ArticleToc'
import { compactNumber, formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { defaultLanguageCode, isRtlLanguage, languageByCode, normalizeLanguageCode, supportedLanguages } from '../i18n'
import { usePublicData } from '../layouts/publicContext'
import { buildQzoneShareUrl, buildWeiboShareUrl, copyShareText, postShareCopyText, type PostShareInput } from '../postShare'
import { webmasterVerificationsFromSeo } from '../seoSettings'
import { buildBlogPostingStructuredData } from '../structuredData'
import { taxonomyPath } from '../taxonomyRoutes'
import type { Comment, Post, PostTranslation } from '../types'
import { publicUIText } from '../uiI18n'

const initialComment = { authorName: '', email: '', website: '', content: '' }

export default function PublicPostPage() {
  const { slug } = useParams()
  const { settings, selectedLanguage } = usePublicData()
  const [post, setPost] = useState<Post | null>(null)
  const [translation, setTranslation] = useState<PostTranslation | null>(null)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState(initialComment)
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [shareManualText, setShareManualText] = useState('')
  const site = settings.site ?? {}
  const seo = settings.seo ?? {}
  const ui = publicUIText(selectedLanguage)
  const commentEnabled = settings.comment?.enabled ?? true

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    api
      .post(slug)
      .then((value) => {
        setPost(value)
        setTranslation(null)
        setTranslationError('')
        return api.publicComments(value.id)
      })
      .then(setComments)
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!post || !slug) return
    const sourceLanguage = normalizeLanguageCode(post.sourceLanguage)
    const targetLanguage = normalizeLanguageCode(selectedLanguage)
    if (targetLanguage === sourceLanguage) {
      setTranslation(null)
      setTranslationError('')
      setTranslationLoading(false)
      return
    }

    let active = true
    setTranslation(null)
    setTranslationError('')
    setTranslationLoading(true)
    api
      .postTranslation(slug, targetLanguage)
      .then((value) => {
        if (active) setTranslation(value)
      })
      .catch((err) => {
        if (active) setTranslationError(apiErrorMessage(err, ui.post.translationFailed))
      })
      .finally(() => {
        if (active) setTranslationLoading(false)
      })
    return () => {
      active = false
    }
  }, [post, selectedLanguage, slug, ui.post.translationFailed])

  async function submitComment(event: FormEvent) {
    event.preventDefault()
    if (!post) return
    setError('')
    setNotice('')
    try {
      await api.comment(post.id, { ...comment, parentId: replyTo?.id })
      setComment(initialComment)
      setReplyTo(null)
      setNotice(replyTo ? ui.post.replySubmitted : ui.post.commentSubmitted)
      const nextComments = await api.publicComments(post.id)
      setComments(nextComments)
    } catch (err) {
      setError(apiErrorMessage(err, ui.post.commentSubmitFailed))
    }
  }

  const effectiveTitle = translation?.title || post?.title
  const effectiveExcerpt = translation?.excerpt || post?.excerpt
  const effectiveContent = translation?.content || post?.content || ''
  const effectiveLanguage = translation?.languageCode || post?.sourceLanguage || selectedLanguage
  const currentUrl = typeof window === 'undefined' ? '' : window.location.href
  const canonicalUrl = typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`
  const alternateLanguages =
    typeof window === 'undefined'
      ? []
      : [
          ...supportedLanguages.map((language) => ({
            hreflang: language.code,
            href:
              language.code === defaultLanguageCode
                ? canonicalUrl
                : `${canonicalUrl}?lang=${encodeURIComponent(language.code)}`,
          })),
          { hreflang: 'x-default', href: canonicalUrl },
        ]

  useDocumentMeta({
    siteTitle: site.title,
    siteDescription: seo.description || site.subtitle,
    siteKeywords: seo.keywords,
    languageCode: effectiveLanguage,
    title: post?.seoTitle || effectiveTitle,
    socialType: 'article',
    canonicalUrl,
    description: post?.seoDescription || effectiveExcerpt || seo.description || site.subtitle,
    keywords: post ? [...post.categories.map((category) => category.name), ...post.tags.map((tag) => tag.name)] : undefined,
    imageUrl: post?.coverUrl,
    verifications: webmasterVerificationsFromSeo(seo),
    alternateLanguages,
    structuredData: post
      ? buildBlogPostingStructuredData({
          title: effectiveTitle || post.title,
          description: post.seoDescription || effectiveExcerpt || seo.description || site.subtitle,
          url: currentUrl,
          imageUrl: post.coverUrl,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          authorName: post.authorName || ui.post.owner,
          siteName: site.title || ui.app.defaultSiteTitle,
          language: effectiveLanguage,
          keywords: [...post.categories.map((category) => category.name), ...post.tags.map((tag) => tag.name)],
        })
      : undefined,
  })

  if (loading) return <LoadingState label={ui.app.loading} />
  if (!post) return <Alert severity="warning">{ui.post.notFound}</Alert>

  const commentTree = buildCommentTree(comments)
  const shareInput: PostShareInput = {
    title: effectiveTitle || post.title,
    excerpt: effectiveExcerpt || post.seoDescription,
    url: window.location.href,
    coverUrl: post.coverUrl,
  }
  const readingStats = articleReadingStats(effectiveContent)
  const metricText = articleMetricText(selectedLanguage)
  const articleHeadings = extractArticleHeadings(effectiveContent)
  const language = languageByCode(effectiveLanguage)

  function legacyCopyText(text: string) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }

  async function copyShareLink() {
    const text = postShareCopyText(shareInput)
    const result = await copyShareText(text, {
      clipboardWriteText: navigator.clipboard?.writeText ? (value) => navigator.clipboard.writeText(value) : undefined,
      legacyCopyText,
    })
    if (result === 'copied') {
      setShareManualText('')
      setShareNotice(ui.post.shareCopied)
      return
    }
    setShareManualText(text)
    setShareNotice(ui.post.manualCopyNotice)
  }

  function renderCommentNode(item: CommentNode, depth = 0) {
    const nested = depth > 0
    return (
      <Box
        key={item.id}
        sx={{
          mt: nested ? 2 : 0,
          pl: nested ? { xs: 2, md: 3 } : 0,
          borderLeft: nested ? '2px solid rgba(37, 107, 87, 0.14)' : 'none',
        }}
      >
        <Stack gap={1.25}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={900}>{item.authorName}</Typography>
              {item.isAdminReply && <Chip size="small" color="primary" label={ui.post.ownerBadge} />}
              {item.parentAuthorName && <Chip size="small" variant="outlined" label={ui.post.replyTo(item.parentAuthorName)} />}
            </Stack>
            <Stack direction="row" gap={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {formatDate(item.createdAt, selectedLanguage)}
              </Typography>
              <Button size="small" startIcon={<Reply size={14} />} onClick={() => setReplyTo(item)}>
                {ui.post.reply}
              </Button>
            </Stack>
          </Stack>
          <Typography className="user-content" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {item.content}
          </Typography>
          {item.children.length > 0 && <Box>{item.children.map((child) => renderCommentNode(child, depth + 1))}</Box>}
        </Stack>
      </Box>
    )
  }

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          {post.categories.map((category) => (
            <Chip key={category.id} component={Link} to={taxonomyPath('category', category.slug)} clickable label={category.name} color="primary" />
          ))}
          {post.tags.map((tag) => (
            <Chip key={tag.id} component={Link} to={taxonomyPath('tag', tag.slug)} clickable label={`# ${tag.name}`} variant="outlined" />
          ))}
        </Stack>
        <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 56 }, maxWidth: 920 }}>
          {effectiveTitle}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.8 }}>
          {effectiveExcerpt}
        </Typography>
        <Stack direction="row" gap={2.5} color="text.secondary" flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`${language.flag} ${language.nativeName}`} color={translation ? 'primary' : 'default'} />
          {translationLoading && <Chip size="small" label={ui.post.translating} color="warning" />}
          <Typography variant="body2">{post.authorName || ui.post.owner}</Typography>
          <Typography variant="body2">{formatDate(post.publishedAt, selectedLanguage)}</Typography>
          <Typography variant="body2">{formatTextUnitCount(readingStats.textUnits, metricText)}</Typography>
          <Typography variant="body2">{formatReadingMinutes(readingStats.readingMinutes, metricText)}</Typography>
          <Stack direction="row" gap={0.5} alignItems="center">
            <Eye size={16} />
            <Typography variant="body2">{compactNumber(post.viewCount, selectedLanguage)}</Typography>
          </Stack>
          <Stack direction="row" gap={0.5} alignItems="center">
            <MessageCircle size={16} />
            <Typography variant="body2">{compactNumber(post.commentCount, selectedLanguage)}</Typography>
          </Stack>
        </Stack>
        {translationError && <Alert severity="info">{ui.post.translationUnavailable(translationError)}</Alert>}
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          <Tooltip title={ui.post.copyTooltip}>
            <Button variant="outlined" startIcon={<Copy size={16} />} onClick={() => void copyShareLink()}>
              {ui.post.copyLink}
            </Button>
          </Tooltip>
          <Button component="a" href={buildWeiboShareUrl(shareInput)} target="_blank" rel="noreferrer" variant="outlined" startIcon={<Share2 size={16} />}>
            {ui.post.weibo}
          </Button>
          <Button component="a" href={buildQzoneShareUrl(shareInput)} target="_blank" rel="noreferrer" variant="outlined" startIcon={<Share2 size={16} />}>
            {ui.post.qzone}
          </Button>
        </Stack>
        {shareNotice && <Alert severity={shareManualText ? 'info' : 'success'}>{shareNotice}</Alert>}
        {shareManualText && (
          <TextField
            label={ui.post.copyPromptTitle}
            value={shareManualText}
            multiline
            minRows={2}
            fullWidth
            InputProps={{ readOnly: true }}
            onFocus={(event) => event.target.select()}
          />
        )}
      </Stack>

      <Box
        sx={{
          height: { xs: 220, md: 380 },
          borderRadius: 2,
          overflow: 'hidden',
          background: post.coverUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.2)), url(${post.coverUrl}) center/cover`
            : 'linear-gradient(135deg, #256B57, #E8DEF8 48%, #FFDCC5)',
        }}
      />

      {articleHeadings.length > 1 && (
        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
          <ArticleToc headings={articleHeadings} title={ui.post.tableOfContents} navLabel={ui.post.tableOfContentsAria} />
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, lg: 4 },
          gridTemplateColumns: { xs: '1fr', lg: articleHeadings.length > 1 ? 'minmax(0, 1fr) 280px' : '1fr' },
          alignItems: 'start',
        }}
      >
        <Box dir={isRtlLanguage(effectiveLanguage) ? 'rtl' : 'ltr'}>
          {translationLoading && (
            <Card
              variant="outlined"
              sx={{
                mb: 3,
                borderStyle: 'dashed',
                bgcolor: 'rgba(178, 106, 0, 0.06)',
              }}
            >
              <CardContent>
                <Stack gap={1.5}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Languages size={18} />
                    <Typography fontWeight={900}>{ui.post.translating}</Typography>
                    <Chip size="small" label={`${language.flag} ${language.nativeName}`} color="warning" variant="outlined" />
                  </Stack>
                  <LinearProgress color="warning" />
                  <Stack gap={0.75}>
                    <Skeleton variant="text" width="96%" />
                    <Skeleton variant="text" width="88%" />
                    <Skeleton variant="text" width="74%" />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}
          <ArticleRenderer content={effectiveContent} />
        </Box>
        {articleHeadings.length > 1 && (
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <ArticleToc headings={articleHeadings} title={ui.post.tableOfContents} navLabel={ui.post.tableOfContentsAria} sticky />
          </Box>
        )}
      </Box>

      <Divider />

      <Stack gap={2}>
        <Typography variant="h5">{ui.post.approvedComments}</Typography>
        {commentTree.length === 0 ? (
          <Typography color="text.secondary">{ui.post.noComments}</Typography>
        ) : (
          commentTree.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>{renderCommentNode(item)}</CardContent>
            </Card>
          ))
        )}
      </Stack>

      {commentEnabled ? (
        <Card>
          <CardContent>
            <Stack component="form" gap={2} onSubmit={submitComment}>
              <Box>
                <Typography variant="h5">{ui.post.comments}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {settings.comment?.notice || ui.post.commentNotice}
                </Typography>
              </Box>
              {replyTo && (
                <Alert
                  severity="info"
                  action={
                    <Button color="inherit" size="small" onClick={() => setReplyTo(null)}>
                      {ui.post.cancel}
                    </Button>
                  }
                >
                  {ui.post.replyingTo(replyTo.authorName)}
                </Alert>
              )}
              {notice && <Alert severity="success">{notice}</Alert>}
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <TextField
                  required
                  label={ui.post.nameLabel}
                  value={comment.authorName}
                  onChange={(event) => setComment((value) => ({ ...value, authorName: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label={ui.post.emailLabel}
                  type="email"
                  value={comment.email}
                  onChange={(event) => setComment((value) => ({ ...value, email: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label={ui.post.websiteLabel}
                  value={comment.website}
                  onChange={(event) => setComment((value) => ({ ...value, website: event.target.value }))}
                  fullWidth
                />
              </Stack>
              <TextField
                required
                label={ui.post.contentLabel}
                value={comment.content}
                onChange={(event) => setComment((value) => ({ ...value, content: event.target.value }))}
                multiline
                minRows={4}
              />
              <Box>
                <Button type="submit" variant="contained" startIcon={<Send size={18} />}>
                  {replyTo ? ui.post.submitReply : ui.post.submitComment}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">{ui.post.commentsClosed}</Alert>
      )}
    </Stack>
  )
}
