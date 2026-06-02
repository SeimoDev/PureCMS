import { Alert, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material'
import { CalendarDays, Eye, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { archiveTotalPosts } from '../archives'
import { compactNumber, formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { usePublicData } from '../layouts/publicContext'
import { webmasterVerificationsFromSeo } from '../seoSettings'
import type { ArchiveYear } from '../types'
import { archiveMonthLabel, publicPageUIText, publicUIText } from '../uiI18n'

export default function PublicArchivesPage() {
  const { settings, selectedLanguage } = usePublicData()
  const [archives, setArchives] = useState<ArchiveYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const site = settings.site ?? {}
  const seo = settings.seo ?? {}
  const ui = publicPageUIText(selectedLanguage)
  const appUI = publicUIText(selectedLanguage)
  const siteTitle = site.title || appUI.app.defaultSiteTitle
  const total = archiveTotalPosts(archives)

  useDocumentMeta({
    siteTitle: site.title,
    siteDescription: seo.description || site.subtitle,
    siteKeywords: seo.keywords,
    languageCode: selectedLanguage,
    title: ui.archives.metaTitle,
    socialType: 'website',
    description: ui.archives.metaDescription(siteTitle),
    keywords: [ui.archives.metaTitle, site.title ?? ''],
    verifications: webmasterVerificationsFromSeo(seo),
  })

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .archives({ lang: selectedLanguage })
      .then(setArchives)
      .catch((err) => setError(apiErrorMessage(err, ui.archives.loadFailed)))
      .finally(() => setLoading(false))
  }, [selectedLanguage, ui.archives.loadFailed])

  if (loading) return <LoadingState label={ui.archives.loading} />

  return (
    <Stack gap={4}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, alignItems: 'end' }}>
        <Stack gap={1.25}>
          <Typography variant="overline" color="primary" fontWeight={900}>
            {ui.archives.eyebrow}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 54 } }}>
            {ui.archives.title}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 680 }}>
            {ui.archives.description}
          </Typography>
        </Stack>
        <Chip icon={<CalendarDays size={16} />} label={ui.archives.totalLabel(total)} color="primary" variant="outlined" />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!error && archives.length === 0 ? (
        <Alert severity="info">{ui.archives.empty}</Alert>
      ) : (
        <Stack gap={4}>
          {archives.map((year) => (
            <Box key={year.year} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '132px minmax(0, 1fr)' }, gap: { xs: 2, md: 4 } }}>
              <Stack gap={0.5} sx={{ position: { md: 'sticky' }, top: { md: 96 }, alignSelf: 'start' }}>
                <Typography variant="h3" color="primary" sx={{ fontSize: { xs: 30, md: 42 } }}>
                  {year.year}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ui.archives.yearPostCount(year.postCount)}
                </Typography>
              </Stack>

              <Stack gap={3}>
                {year.months.map((month) => (
                  <Box key={`${year.year}-${month.month}`} sx={{ borderLeft: '2px solid rgba(37, 107, 87, 0.18)', pl: { xs: 2, md: 3 } }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
                      <Typography variant="h5">{archiveMonthLabel(selectedLanguage, month.month)}</Typography>
                      <Chip size="small" label={ui.archives.monthPostCount(month.postCount)} variant="outlined" />
                    </Stack>
                    <Stack divider={<Divider flexItem />} sx={{ borderTop: '1px solid rgba(37, 107, 87, 0.12)' }}>
                      {month.posts.map((post) => (
                        <Button
                          key={post.id}
                          component={Link}
                          to={`/posts/${post.slug}`}
                          color="inherit"
                          sx={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            px: 0,
                            py: 1.75,
                            borderRadius: 0,
                          }}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                              <Typography variant="h6" sx={{ fontSize: 18 }}>
                                {post.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                {formatDate(post.publishedAt, selectedLanguage)}
                              </Typography>
                            </Stack>
                            <Typography color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>
                              {post.excerpt || ui.archives.noExcerpt}
                            </Typography>
                            <Stack direction="row" gap={2} color="text.secondary" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                              <Stack direction="row" gap={0.5} alignItems="center">
                                <Eye size={14} />
                                <Typography variant="caption">{compactNumber(post.viewCount, selectedLanguage)}</Typography>
                              </Stack>
                              <Stack direction="row" gap={0.5} alignItems="center">
                                <MessageCircle size={14} />
                                <Typography variant="caption">{compactNumber(post.commentCount, selectedLanguage)}</Typography>
                              </Stack>
                            </Stack>
                          </Box>
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
