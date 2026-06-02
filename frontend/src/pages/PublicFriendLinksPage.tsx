import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { ExternalLink, Link2, Sparkles } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { usePublicData } from '../layouts/publicContext'
import { friendLinkDisplayHost, friendLinkInitial } from '../publicFriendLinks'
import { webmasterVerificationsFromSeo } from '../seoSettings'
import { publicPageUIText, publicUIText } from '../uiI18n'

export default function PublicFriendLinksPage() {
  const { settings, friendLinks, selectedLanguage } = usePublicData()
  const site = settings.site ?? {}
  const seo = settings.seo ?? {}
  const ui = publicPageUIText(selectedLanguage)
  const appUI = publicUIText(selectedLanguage)
  const siteTitle = site.title || appUI.app.defaultSiteTitle

  useDocumentMeta({
    siteTitle: site.title,
    siteDescription: seo.description || site.subtitle,
    siteKeywords: seo.keywords,
    languageCode: selectedLanguage,
    title: ui.links.metaTitle,
    socialType: 'website',
    description: ui.links.metaDescription(siteTitle),
    keywords: [ui.links.metaTitle, site.title ?? ''],
    verifications: webmasterVerificationsFromSeo(seo),
  })

  return (
    <Stack gap={4}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, alignItems: 'end' }}>
        <Stack gap={1.25}>
          <Typography variant="overline" color="primary" fontWeight={900}>
            {ui.links.eyebrow}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 54 }, maxWidth: 760 }}>
            {ui.links.title}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 720 }}>
            {ui.links.description}
          </Typography>
        </Stack>
        <Chip icon={<Link2 size={16} />} label={ui.links.totalLabel(friendLinks.length)} color="primary" variant="outlined" />
      </Box>

      {friendLinks.length === 0 ? (
        <EmptyState title={ui.links.empty} />
      ) : (
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {friendLinks.map((link, index) => {
            const host = friendLinkDisplayHost(link.url)
            return (
              <Card key={link.id} sx={{ height: '100%', overflow: 'hidden' }}>
                <CardActionArea
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ height: '100%' }}>
                    <Stack direction="row" gap={2} alignItems="flex-start" sx={{ minHeight: 132 }}>
                      <Avatar
                        src={link.logoUrl || undefined}
                        alt={link.name}
                        variant="rounded"
                        sx={{
                          width: 58,
                          height: 58,
                          bgcolor: index % 2 === 0 ? 'primary.main' : 'secondary.main',
                          color: index % 2 === 0 ? 'primary.contrastText' : 'secondary.contrastText',
                          fontWeight: 900,
                        }}
                      >
                        {friendLinkInitial(link.name, ui.links.initialFallback)}
                      </Avatar>
                      <Stack gap={1.25} flex={1} minWidth={0}>
                        <Stack direction="row" alignItems="center" gap={1} justifyContent="space-between">
                          <Typography variant="h5" sx={{ fontSize: 22 }}>
                            {link.name}
                          </Typography>
                          <ExternalLink size={18} />
                        </Stack>
                        {host && (
                          <Typography variant="body2" color="primary" sx={{ wordBreak: 'break-all' }}>
                            {host}
                          </Typography>
                        )}
                        <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                          {link.description || ui.links.fallbackDescription}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Stack direction="row" gap={1.25} alignItems="center">
              <Sparkles size={18} />
              <Typography fontWeight={900}>{ui.links.exchangeNotice}</Typography>
            </Stack>
            {site.email && (
              <Button component="a" href={`mailto:${site.email}`} variant="outlined" startIcon={<ExternalLink size={16} />}>
                {ui.links.contactOwner}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
