import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@mui/material'
import { Archive, BookOpen, FileText, Home, LayoutDashboard, Link2, Menu, Rss, Search, Wrench, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { normalizeAppearanceSettings } from '../appearance'
import LoadingState from '../components/LoadingState'
import { defaultLanguageCode, languageOptionLabel, languageStorageKey, normalizeLanguageCode, preferredLanguageFromEnvironment, supportedLanguages } from '../i18n'
import { maintenanceUIText } from '../maintenanceI18n'
import { normalizeMaintenanceSettings } from '../maintenanceSettings'
import { publicNavItems, type PublicNavKind } from '../publicNavigation'
import { createCmsTheme } from '../theme'
import type { Category, FriendLink, Page, SiteSettings, Tag } from '../types'
import { documentDirectionForLanguage, publicUIText } from '../uiI18n'

const publicNavIcons: Record<PublicNavKind, typeof Home> = {
  home: Home,
  archives: Archive,
  links: Link2,
  page: FileText,
}
function initialLanguage() {
  return preferredLanguageFromEnvironment(localStorage, navigator.languages)
}

export default function PublicLayout() {
  const [settings, setSettings] = useState<SiteSettings>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [friendLinks, setFriendLinks] = useState<FriendLink[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [siteLoaded, setSiteLoaded] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage)
  const navigate = useNavigate()
  const location = useLocation()
  const ui = useMemo(() => publicUIText(selectedLanguage), [selectedLanguage])
  const maintenanceText = useMemo(() => maintenanceUIText(selectedLanguage), [selectedLanguage])
  const documentDirection = documentDirectionForLanguage(selectedLanguage)

  useEffect(() => {
    api
      .site()
      .then(async (site) => {
        setSettings(site)
        if (normalizeMaintenanceSettings(site.maintenance).enabled) {
          return
        }
        const [categoriesValue, tagsValue, friendLinksValue, pagesValue] = await Promise.all([api.categories(), api.tags(), api.friendLinks(), api.pages()])
        setCategories(categoriesValue)
        setTags(tagsValue)
        setFriendLinks(friendLinksValue)
        setPages(pagesValue)
      })
      .catch(() => undefined)
      .finally(() => setSiteLoaded(true))
  }, [])

  useEffect(() => {
    document.documentElement.lang = normalizeLanguageCode(selectedLanguage)
    document.documentElement.dir = documentDirection
    return () => {
      document.documentElement.lang = 'zh-CN'
      document.documentElement.dir = 'ltr'
    }
  }, [documentDirection, selectedLanguage])

  useEffect(() => {
    const rawLanguage = searchParams.get('lang')
    if (!rawLanguage) return
    const nextLanguage = normalizeLanguageCode(rawLanguage)
    if (nextLanguage === selectedLanguage) return
    setSelectedLanguage(nextLanguage)
    localStorage.setItem(languageStorageKey, nextLanguage)
  }, [searchParams, selectedLanguage])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('q', keyword.trim())
    setMobileNavOpen(false)
    navigate({ pathname: '/', search: params.toString() })
  }

  function changeLanguage(value: string) {
    const nextLanguage = normalizeLanguageCode(value)
    setSelectedLanguage(nextLanguage)
    localStorage.setItem(languageStorageKey, nextLanguage)
    const params = new URLSearchParams(searchParams)
    if (nextLanguage === defaultLanguageCode) params.delete('lang')
    else params.set('lang', nextLanguage)
    setSearchParams(params, { replace: true })
  }

  const site = settings.site ?? {}
  const appearance = normalizeAppearanceSettings(settings.appearance)
  const publicTheme = useMemo(
    () =>
      createCmsTheme({
        accentColor: appearance.accentColor,
        coverStyle: appearance.coverStyle,
        homeLayout: appearance.homeLayout,
        themeMode: appearance.themeMode,
      }),
    [appearance.accentColor, appearance.coverStyle, appearance.homeLayout, appearance.themeMode],
  )
  const dark = appearance.themeMode === 'dark'
  const navItems = useMemo(() => publicNavItems(pages), [pages])
  const maintenance = normalizeMaintenanceSettings(settings.maintenance)

  function isActiveNav(to: string) {
    return to === '/' ? location.pathname === '/' : location.pathname === to
  }

  function navLabel(kind: PublicNavKind, label: string) {
    switch (kind) {
      case 'home':
        return ui.app.navHome
      case 'archives':
        return ui.app.navArchives
      case 'links':
        return ui.app.navLinks
      default:
        return label
    }
  }

  const mainContent =
    !siteLoaded ? (
      <LoadingState label={ui.app.loading} />
    ) : maintenance.enabled ? (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: 360, md: 520 }, textAlign: 'center' }}>
        <Stack gap={2.5} alignItems="center" sx={{ maxWidth: 620 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.container',
              color: 'primary.onContainer',
            }}
          >
            <Wrench size={30} />
          </Box>
          <Stack gap={1}>
            <Typography variant="h3">{maintenanceText.publicTitle}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9 }}>
              {maintenance.message || maintenanceText.publicDefaultMessage}
            </Typography>
          </Stack>
          <Button component={Link} to="/admin" variant="contained" startIcon={<LayoutDashboard size={18} />}>
            {maintenanceText.adminEntry}
          </Button>
        </Stack>
      </Box>
    ) : (
      <Outlet context={{ settings, categories, tags, friendLinks, pages, selectedLanguage, setSelectedLanguage: changeLanguage }} />
    )

  return (
    <ThemeProvider theme={publicTheme}>
      <Box
        dir={documentDirection}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary',
          background: dark
            ? 'linear-gradient(135deg, rgba(121, 214, 185, 0.08), rgba(35, 42, 38, 0.95) 42%, rgba(103, 80, 164, 0.12)), #101915'
            : 'linear-gradient(135deg, rgba(121, 214, 185, 0.12), rgba(255, 220, 197, 0.16) 45%, rgba(103, 80, 164, 0.06)), #f8faf7',
        }}
      >
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 72 }}>
            <Button component={Link} to="/" color="inherit" startIcon={<BookOpen size={18} />} sx={{ px: 1 }}>
              <Stack alignItems="flex-start" spacing={0}>
                <Typography variant="subtitle1" fontWeight={900}>
                  {site.logoText || 'CMS'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                  {site.title || ui.app.defaultSiteTitle}
                </Typography>
              </Stack>
            </Button>
            <Box component="form" onSubmit={submit} sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }}>
              <TextField
                fullWidth
                size="small"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={ui.app.searchPlaceholder}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Stack direction="row" gap={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {navItems
                .filter((item) => item.kind !== 'home')
                .map((item) => {
                  const Icon = publicNavIcons[item.kind]
                  return (
                    <Button
                      key={item.key}
                      component={Link}
                      to={item.to}
                      color={isActiveNav(item.to) ? 'primary' : 'inherit'}
                      size="small"
                      startIcon={<Icon size={16} />}
                    >
                      {navLabel(item.kind, item.label)}
                    </Button>
                  )
                })}
            </Stack>
            <TextField
              select
              size="small"
              value={selectedLanguage}
              onChange={(event) => changeLanguage(event.target.value)}
              sx={{ width: 150, display: { xs: 'none', sm: 'block' } }}
              inputProps={{ 'aria-label': ui.app.languageLabel }}
            >
              {supportedLanguages.map((language) => (
                <MenuItem key={language.code} value={language.code}>
                  {languageOptionLabel(language)}
                </MenuItem>
              ))}
            </TextField>
            <IconButton
              aria-label={mobileNavOpen ? ui.app.closeNav : ui.app.openNav}
              onClick={() => setMobileNavOpen((open) => !open)}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, ml: 'auto' }}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </IconButton>
            <IconButton component={Link} to="/admin" aria-label={ui.app.adminAria} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <LayoutDashboard size={20} />
            </IconButton>
          </Toolbar>
        </Container>
        </AppBar>

        <Drawer
          anchor="right"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '86vw', sm: 360 },
              maxWidth: 380,
              p: 2,
              borderTopLeftRadius: 18,
              borderBottomLeftRadius: 18,
              bgcolor: 'background.default',
            },
          }}
        >
          <Stack gap={2} sx={{ minHeight: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack spacing={0}>
                <Typography variant="subtitle1" fontWeight={900}>
                  {site.logoText || 'CMS'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {site.title || ui.app.defaultSiteTitle}
                </Typography>
              </Stack>
              <IconButton aria-label={ui.app.closeNav} onClick={() => setMobileNavOpen(false)}>
                <X size={20} />
              </IconButton>
            </Stack>

            <Box component="form" onSubmit={submit}>
              <TextField
                fullWidth
                size="small"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={ui.app.searchPlaceholder}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              select
              size="small"
              label={ui.app.languageLabel}
              value={selectedLanguage}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {supportedLanguages.map((language) => (
                <MenuItem key={language.code} value={language.code}>
                  {languageOptionLabel(language)}
                </MenuItem>
              ))}
            </TextField>

            <List disablePadding sx={{ display: 'grid', gap: 0.75 }}>
              {navItems.map((item) => {
                const Icon = publicNavIcons[item.kind]
                const active = isActiveNav(item.to)
                return (
                  <ListItemButton
                    key={item.key}
                    component={Link}
                    to={item.to}
                    selected={active}
                    onClick={() => setMobileNavOpen(false)}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                      <Icon size={18} />
                    </ListItemIcon>
                    <ListItemText primary={navLabel(item.kind, item.label)} />
                  </ListItemButton>
                )
              })}
            </List>

            <Divider />
            <Button
              component={Link}
              to="/admin"
              variant="outlined"
              startIcon={<LayoutDashboard size={18} />}
              onClick={() => setMobileNavOpen(false)}
            >
              {ui.app.admin}
            </Button>
          </Stack>
        </Drawer>

        <Container maxWidth="lg" sx={{ flex: 1, py: { xs: 3, md: 5 } }}>
          {mainContent}
        </Container>

        <Box component="footer" sx={{ py: 4, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={900}>
                {site.title || ui.app.defaultSiteTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {site.subtitle || ui.app.defaultSiteSubtitle}
              </Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              {site.icp && (
                <Chip
                  size="small"
                  component={site.icpUrl ? 'a' : 'div'}
                  href={site.icpUrl || undefined}
                  target={site.icpUrl ? '_blank' : undefined}
                  rel={site.icpUrl ? 'noreferrer' : undefined}
                  clickable={Boolean(site.icpUrl)}
                  label={site.icp}
                  variant="outlined"
                />
              )}
              {site.policeRecord && (
                <Chip
                  size="small"
                  component={site.policeRecordUrl ? 'a' : 'div'}
                  href={site.policeRecordUrl || undefined}
                  target={site.policeRecordUrl ? '_blank' : undefined}
                  rel={site.policeRecordUrl ? 'noreferrer' : undefined}
                  clickable={Boolean(site.policeRecordUrl)}
                  label={site.policeRecord}
                  variant="outlined"
                />
              )}
              <Chip size="small" component="a" href="/rss.xml" icon={<Rss size={14} />} clickable label={ui.app.rss} variant="outlined" />
              {site.wechat && <Chip size="small" label={`${ui.app.wechatPrefix}${site.wechat}`} variant="outlined" />}
              {site.email && <Chip size="small" label={site.email} variant="outlined" />}
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          {friendLinks.length > 0 && (
            <>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Stack direction="row" gap={0.75} alignItems="center" color="text.secondary">
                  <Link2 size={14} />
                  <Typography variant="caption">{ui.app.friendLinks}</Typography>
                </Stack>
                {friendLinks.map((link) => (
                  <Chip
                    key={link.id}
                    size="small"
                    component={Link}
                    to="/links"
                    clickable
                    label={link.name}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </>
          )}
          <Typography variant="caption" color="text.secondary">
            {ui.app.poweredBy}
          </Typography>
        </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
