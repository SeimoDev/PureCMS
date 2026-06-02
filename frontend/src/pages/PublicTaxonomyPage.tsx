import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Eye, FolderOpen, Hash, MessageCircle, Search } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { normalizeAppearanceSettings } from '../appearance'
import EmptyState from '../components/EmptyState'
import { compactNumber, formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { usePublicData } from '../layouts/publicContext'
import { clampPage, pageCount } from '../pagination'
import { webmasterVerificationsFromSeo } from '../seoSettings'
import { findTaxonomyItem, taxonomyPath, type TaxonomyKind } from '../taxonomyRoutes'
import type { Post } from '../types'
import { publicPageUIText, publicUIText } from '../uiI18n'

const taxonomyPageSize = 10

type PublicTaxonomyPageProps = {
  kind: TaxonomyKind
}

export default function PublicTaxonomyPage({ kind }: PublicTaxonomyPageProps) {
  const { slug = '' } = useParams()
  const { settings, categories, tags, selectedLanguage } = usePublicData()
  const [searchParams] = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(taxonomyPageSize)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const navigate = useNavigate()

  const query = searchParams.get('q') ?? ''
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const site = settings.site ?? {}
  const seo = settings.seo ?? {}
  const ui = publicPageUIText(selectedLanguage)
  const appUI = publicUIText(selectedLanguage)
  const appearance = normalizeAppearanceSettings(settings.appearance)
  const item = findTaxonomyItem(kind, slug, categories, tags)
  const itemName = item?.name ?? slug
  const title = kind === 'category' ? ui.taxonomy.categoryFallbackTitle(itemName) : ui.taxonomy.tagFallbackTitle(itemName)
  const itemDescriptionValue = item && 'description' in item ? item.description : ''
  const itemDescription = typeof itemDescriptionValue === 'string' ? itemDescriptionValue.trim() : ''
  const description = itemDescription || (kind === 'category' ? appUI.home.categoryDescription(itemName) : appUI.home.tagDescription(itemName))
  const relatedItems = kind === 'category' ? categories : tags
  const pageTitle = query ? ui.taxonomy.searchPageTitle(title, query) : title
  const icon = kind === 'category' ? <FolderOpen size={18} /> : <Hash size={18} />

  useDocumentMeta({
    siteTitle: site.title,
    siteDescription: seo.description || site.subtitle,
    siteKeywords: seo.keywords,
    languageCode: selectedLanguage,
    title: pageTitle,
    socialType: 'website',
    description: query ? ui.taxonomy.searchDescription(description, query) : description,
    keywords: [item?.name ?? slug, query],
    verifications: webmasterVerificationsFromSeo(seo),
  })

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(() => {
    setLoading(true)
    api
      .postsPage({
        q: query,
        category: kind === 'category' ? slug : undefined,
        tag: kind === 'tag' ? slug : undefined,
        lang: selectedLanguage,
        limit: taxonomyPageSize,
        page: currentPage,
      })
      .then((value) => {
        setPosts(value.items)
        setTotal(value.total)
        setPageLimit(value.limit)
      })
      .finally(() => setLoading(false))
  }, [currentPage, kind, query, selectedLanguage, slug])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    navigate({ pathname: taxonomyPath(kind, slug), search: params.toString() })
  }

  function changePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    navigate({ pathname: taxonomyPath(kind, slug), search: params.toString() })
  }

  return (
    <Stack gap={4}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
          alignItems: 'end',
        }}
      >
        <Stack gap={1.5}>
          <Stack direction="row" gap={1} alignItems="center" color="primary.main">
            {icon}
            <Typography variant="overline" fontWeight={900}>
              {kind === 'category' ? ui.taxonomy.categoryEyebrow : ui.taxonomy.tagEyebrow}
            </Typography>
          </Stack>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 48 }, maxWidth: 760 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, lineHeight: 1.9 }}>
            {description}
          </Typography>
        </Stack>
        <Box component="form" onSubmit={submit}>
          <TextField
            fullWidth
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={kind === 'category' ? ui.taxonomy.categorySearchPlaceholder : ui.taxonomy.tagSearchPlaceholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        <Chip component={Link} to="/" clickable label={ui.taxonomy.allPosts} variant="outlined" />
        {relatedItems.map((related) => (
          <Chip
            key={related.id}
            component={Link}
            to={taxonomyPath(kind, related.slug)}
            clickable
            label={kind === 'category' ? `${related.name} ${related.postCount}` : `# ${related.name}`}
            color={related.slug === slug ? 'primary' : 'default'}
            variant={related.slug === slug ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {loading ? (
        <LoadingState label={appUI.app.loading} />
      ) : posts.length === 0 ? (
        <EmptyState title={query ? ui.taxonomy.emptyWithQuery : ui.taxonomy.empty} />
      ) : (
        <Stack gap={2.5}>
          <Stack gap={2}>
            {posts.map((post) => (
              <Card key={post.id} sx={{ overflow: 'hidden' }}>
                <CardActionArea
                  component={Link}
                  to={`/posts/${post.slug}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
                    alignItems: 'stretch',
                  }}
                >
                  <Box
                    sx={{
                      minHeight: { xs: 150, md: '100%' },
                      background: post.coverUrl
                        ? `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.28)), url(${post.coverUrl}) center/cover`
                        : `linear-gradient(135deg, ${appearance.accentColor}, rgba(255, 220, 197, 0.72))`,
                    }}
                  />
                  <CardContent>
                    <Stack gap={1.5}>
                      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                        {post.categories.map((category) => (
                          <Chip key={category.id} size="small" label={category.name} color="primary" variant="outlined" />
                        ))}
                        {post.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag.id} size="small" label={`# ${tag.name}`} variant="outlined" />
                        ))}
                      </Stack>
                      <Typography variant="h5">{post.title}</Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                        {post.excerpt || post.content.slice(0, 140)}
                      </Typography>
                      <Stack direction="row" gap={2} color="text.secondary" flexWrap="wrap" useFlexGap>
                        <Typography variant="caption">{formatDate(post.publishedAt, selectedLanguage)}</Typography>
                        <Stack direction="row" gap={0.5} alignItems="center">
                          <Eye size={14} />
                          <Typography variant="caption">{compactNumber(post.viewCount, selectedLanguage)}</Typography>
                        </Stack>
                        <Stack direction="row" gap={0.5} alignItems="center">
                          <MessageCircle size={14} />
                          <Typography variant="caption">{compactNumber(post.commentCount, selectedLanguage)}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
            <Typography variant="body2" color="text.secondary">
              {ui.taxonomy.count(total, visiblePage, pages)}
            </Typography>
            <Pagination
              count={pages}
              page={visiblePage}
              color="primary"
              onChange={(_, value) => changePage(value)}
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
