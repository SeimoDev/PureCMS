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
import { Eye, MessageCircle, Search } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { normalizeAppearanceSettings } from '../appearance'
import EmptyState from '../components/EmptyState'
import { compactNumber, formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { usePublicData } from '../layouts/publicContext'
import { clampPage, pageCount } from '../pagination'
import { webmasterVerificationsFromSeo } from '../seoSettings'
import { buildWebSiteStructuredData } from '../structuredData'
import { taxonomyPath } from '../taxonomyRoutes'
import type { Post } from '../types'
import { publicUIText } from '../uiI18n'

const publicPostPageSize = 10

export default function PublicHomePage() {
  const { settings, categories, tags, selectedLanguage } = usePublicData()
  const [searchParams] = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(publicPostPageSize)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const navigate = useNavigate()

  const selectedCategory = searchParams.get('category') ?? ''
  const selectedTag = searchParams.get('tag') ?? ''
  const query = searchParams.get('q') ?? ''
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const site = settings.site ?? {}
  const seo = settings.seo ?? {}
  const ui = publicUIText(selectedLanguage)
  const appearance = normalizeAppearanceSettings(settings.appearance)
  const listLayout = appearance.homeLayout === 'list'
  const plainCover = appearance.coverStyle === 'plain'
  const accentColor = appearance.accentColor
  const selectedCategoryName = categories.find((category) => category.slug === selectedCategory)?.name
  const selectedTagName = tags.find((tag) => tag.slug === selectedTag)?.name
  const filterTitle = query
    ? ui.home.searchTitle(query)
    : selectedCategoryName
      ? ui.home.categoryTitle(selectedCategoryName)
      : selectedTagName
        ? ui.home.tagTitle(selectedTagName)
        : undefined
  const homeUrl = typeof window === 'undefined' ? '/' : `${window.location.origin}/`

  useDocumentMeta({
    siteTitle: site.title,
    siteDescription: seo.description || site.subtitle,
    siteKeywords: seo.keywords,
    languageCode: selectedLanguage,
    title: filterTitle,
    socialType: 'website',
    description: query
      ? ui.home.searchDescription(query)
      : selectedCategoryName
        ? ui.home.categoryDescription(selectedCategoryName)
        : selectedTagName
          ? ui.home.tagDescription(selectedTagName)
          : seo.description || site.subtitle || ui.app.defaultSiteSubtitle,
    keywords: [query, selectedCategoryName ?? '', selectedTagName ?? ''],
    verifications: webmasterVerificationsFromSeo(seo),
    structuredData: buildWebSiteStructuredData({
      name: site.title || ui.app.defaultSiteTitle,
      description: seo.description || site.subtitle || ui.app.defaultSiteSubtitle,
      url: homeUrl,
      searchUrl: `${homeUrl}?q={search_term_string}`,
    }),
  })

  useEffect(() => {
    setLoading(true)
    api
      .postsPage({ q: query, category: selectedCategory, tag: selectedTag, lang: selectedLanguage, limit: publicPostPageSize, page: currentPage })
      .then((value) => {
        setPosts(value.items)
        setTotal(value.total)
        setPageLimit(value.limit)
      })
      .finally(() => setLoading(false))
  }, [currentPage, query, selectedCategory, selectedLanguage, selectedTag])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    navigate({ pathname: '/', search: params.toString() })
  }

  function changePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    navigate({ pathname: '/', search: params.toString() })
  }

  return (
    <Stack gap={4}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' }, alignItems: 'end' }}>
        <Stack gap={2}>
          <Typography variant="overline" color="primary" fontWeight={900}>
            {ui.home.contentHub}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 54 }, maxWidth: 760 }}>
            {site.title || ui.home.unnamedBlog}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, lineHeight: 1.8 }}>
            {site.subtitle || ui.app.defaultSiteSubtitle}
          </Typography>
        </Stack>
        <Box component="form" onSubmit={submit}>
          <TextField
            fullWidth
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={ui.home.siteSearch}
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
        <Chip component={Link} to="/" clickable label={ui.home.all} color={!selectedCategory && !selectedTag ? 'primary' : 'default'} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            component={Link}
            to={taxonomyPath('category', category.slug)}
            clickable
            label={`${category.name} ${category.postCount}`}
            color={selectedCategory === category.slug ? 'primary' : 'default'}
            variant={selectedCategory === category.slug ? 'filled' : 'outlined'}
          />
        ))}
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            component={Link}
            to={taxonomyPath('tag', tag.slug)}
            clickable
            label={`# ${tag.name}`}
            color={selectedTag === tag.slug ? 'secondary' : 'default'}
            variant={selectedTag === tag.slug ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {loading ? (
        <LoadingState label={ui.app.loading} />
      ) : posts.length === 0 ? (
        <EmptyState title={ui.home.noMatches} />
      ) : (
        <Stack gap={2.5}>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: listLayout ? '1fr' : { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
            {posts.map((post, index) => {
              const heroCard = !listLayout && index === 0 && !query && currentPage === 1
              return (
                <Box key={post.id} sx={{ gridColumn: { md: heroCard ? '1 / -1' : 'auto' } }}>
                  <Card sx={{ height: '100%', overflow: 'hidden' }}>
                    <CardActionArea
                      component={Link}
                      to={`/posts/${post.slug}`}
                      sx={{
                        height: '100%',
                        display: { xs: 'block', md: listLayout ? 'grid' : 'block' },
                        gridTemplateColumns: listLayout ? '240px minmax(0, 1fr)' : undefined,
                      }}
                    >
                      <Box
                        sx={{
                          minHeight: plainCover ? { xs: 8, md: listLayout ? '100%' : 10 } : heroCard ? { xs: 180, md: 260 } : 164,
                          background:
                            !plainCover && post.coverUrl
                              ? `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.28)), url(${post.coverUrl}) center/cover`
                              : `linear-gradient(135deg, ${accentColor}, rgba(255, 220, 197, 0.72))`,
                          display: 'flex',
                          alignItems: 'flex-end',
                          p: plainCover ? 0 : 2,
                        }}
                      >
                        {post.featured && <Chip color="secondary" label={ui.home.featured} />}
                      </Box>
                      <CardContent>
                        <Stack gap={1.5}>
                          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                            {post.categories.map((category) => (
                              <Chip key={category.id} size="small" label={category.name} color="primary" variant="outlined" />
                            ))}
                          </Stack>
                          <Typography variant={heroCard ? 'h4' : 'h5'}>{post.title}</Typography>
                          <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                            {post.excerpt || post.content.slice(0, 120)}
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
                </Box>
              )
            })}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
            <Typography variant="body2" color="text.secondary">
              {ui.home.count(total, visiblePage, pages)}
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
