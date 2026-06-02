import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import ArticleRenderer from '../components/ArticleRenderer'
import LoadingState from '../components/LoadingState'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { usePublicData } from '../layouts/publicContext'
import { webmasterVerificationsFromSeo } from '../seoSettings'
import { buildWebPageStructuredData } from '../structuredData'
import type { Page } from '../types'
import { publicPageUIText, publicUIText } from '../uiI18n'

export default function PublicPagePage() {
  const { slug } = useParams()
  const { settings, selectedLanguage } = usePublicData()
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const site = settings.site ?? {}
  const seo = settings.seo ?? {}
  const ui = publicPageUIText(selectedLanguage)
  const appUI = publicUIText(selectedLanguage)
  const currentUrl = typeof window === 'undefined' ? '' : window.location.href

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    api
      .page(slug)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false))
  }, [slug])

  useDocumentMeta({
    siteTitle: site.title,
    siteDescription: seo.description || site.subtitle,
    siteKeywords: seo.keywords,
    languageCode: selectedLanguage,
    title: page?.seoTitle || page?.title,
    socialType: 'article',
    description: page?.seoDescription || seo.description || site.subtitle,
    keywords: page ? [page.title] : undefined,
    verifications: webmasterVerificationsFromSeo(seo),
    structuredData: page
      ? buildWebPageStructuredData({
          title: page.seoTitle || page.title,
          description: page.seoDescription || seo.description || site.subtitle,
          url: currentUrl,
          dateModified: page.updatedAt,
          siteName: site.title || appUI.app.defaultSiteTitle,
          language: selectedLanguage,
        })
      : undefined,
  })

  if (loading) return <LoadingState label={appUI.app.loading} />
  if (!page) return <Alert severity="warning">{ui.page.notFound}</Alert>

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Chip
          icon={<FileText size={14} />}
          label={ui.page.customPage}
          color="primary"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        />
        <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 56 }, maxWidth: 920 }}>
          {page.title}
        </Typography>
        {page.seoDescription && (
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 780, lineHeight: 1.8 }}>
            {page.seoDescription}
          </Typography>
        )}
      </Stack>
      <Box sx={{ maxWidth: 880 }}>
        <ArticleRenderer content={page.content} />
      </Box>
    </Stack>
  )
}
