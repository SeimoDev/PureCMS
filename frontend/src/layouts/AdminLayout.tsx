import {
  AppBar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  BookOpen,
  ChartNoAxesCombined,
  Download,
  FolderTree,
  History,
  Images,
  Languages,
  Link2,
  LogOut,
  Menu,
  MessageSquareText,
  Newspaper,
  PanelTop,
  ServerCog,
  Settings,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminUIText, type AdminUIText } from '../adminI18n'
import { blockedAdminNavItem, isActiveAdminPath, visibleAdminNavItems, type AdminNavKey } from '../adminNavigation'
import { api, authEvents, authStorage } from '../api/client'
import LoadingState from '../components/LoadingState'
import { languageOptionLabel, languageStorageKey, normalizeLanguageCode, preferredLanguageFromEnvironment, supportedLanguages } from '../i18n'
import type { User } from '../types'
import { documentDirectionForLanguage } from '../uiI18n'

const drawerWidth = 264

const navIcons = {
  dashboard: ChartNoAxesCombined,
  account: UserCog,
  analytics: TrendingUp,
  posts: Newspaper,
  pages: PanelTop,
  media: Images,
  taxonomy: FolderTree,
  friendLinks: Link2,
  comments: MessageSquareText,
  users: Users,
  activity: History,
  backup: Download,
  system: ServerCog,
  translations: Languages,
  settings: Settings,
} satisfies Record<AdminNavKey, typeof ChartNoAxesCombined>

export type AdminOutletContext = {
  adminLanguage: string
  setAdminLanguage: (value: string) => void
  adminText: AdminUIText
  currentUser: User
  isAdmin: boolean
}

function initialAdminLanguage() {
  return preferredLanguageFromEnvironment(localStorage, navigator.languages)
}

export default function AdminLayout() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [adminLanguage, setAdminLanguage] = useState(initialAdminLanguage)
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const adminText = useMemo(() => adminUIText(adminLanguage), [adminLanguage])
  const documentDirection = documentDirectionForLanguage(adminLanguage)

  useEffect(() => {
    if (!authStorage.token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(setUser)
      .catch(() => authStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return authEvents.onExpired(() => {
      setUser(null)
      setLoading(false)
      navigate('/login', { replace: true, state: { from: location.pathname } })
    })
  }, [location.pathname, navigate])

  useEffect(() => {
    document.documentElement.lang = normalizeLanguageCode(adminLanguage)
    document.documentElement.dir = documentDirection
    return () => {
      document.documentElement.lang = 'zh-CN'
      document.documentElement.dir = 'ltr'
    }
  }, [adminLanguage, documentDirection])

  function changeAdminLanguage(value: string) {
    const code = normalizeLanguageCode(value)
    setAdminLanguage(code)
    localStorage.setItem(languageStorageKey, code)
  }

  if (!authStorage.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (loading) return <LoadingState label={adminText.shell.loading} />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  async function logout() {
    try {
      await api.logout()
    } catch {
      // Local logout should still proceed if the server session is already gone.
    } finally {
      authStorage.clear()
      navigate('/login', { replace: true })
    }
  }

  const roleLabel = user.role === 'admin' ? adminText.shell.roleAdmin : adminText.shell.roleEditor
  const blockedItem = blockedAdminNavItem(location.pathname, user.role)
  const blockedItemLabel = blockedItem ? adminText.shell.nav[blockedItem.labelKey] : ''

  const drawer = (
    <Stack sx={{ height: '100%' }}>
      <Toolbar sx={{ px: 3 }}>
        <Stack>
          <Typography variant="h6" fontWeight={900}>
            PureCMS
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.displayName} · {roleLabel}
          </Typography>
        </Stack>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1, overflowY: 'auto' }}>
        {visibleAdminNavItems(user.role).map((item) => {
          const Icon = navIcons[item.labelKey]
          const active = isActiveAdminPath(location.pathname, item.to)
          return (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={active}
              onClick={() => setDrawerOpen(false)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>
                <Icon size={20} />
              </ListItemIcon>
              <ListItemText primary={adminText.shell.nav[item.labelKey]} />
            </ListItemButton>
          )
        })}
      </List>
      <Stack gap={1} sx={{ p: 2 }}>
        <Button component={Link} to="/" startIcon={<BookOpen size={18} />} color="inherit">
          {adminText.shell.viewSite}
        </Button>
        <Button onClick={logout} startIcon={<LogOut size={18} />} color="error">
          {adminText.shell.logout}
        </Button>
      </Stack>
    </Stack>
  )

  return (
    <Box dir={documentDirection} sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid rgba(37, 107, 87, 0.12)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {!desktop && (
            <IconButton onClick={() => setDrawerOpen(true)} aria-label={adminText.shell.openNav}>
              <Menu size={20} />
            </IconButton>
          )}
          <Typography variant="h6" fontWeight={900}>
            {adminText.shell.title}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            select
            size="small"
            value={adminLanguage}
            onChange={(event) => changeAdminLanguage(event.target.value)}
            sx={{ width: { xs: 128, sm: 172 } }}
            inputProps={{ 'aria-label': adminText.shell.languageLabel }}
          >
            {supportedLanguages.map((language) => (
              <MenuItem key={language.code} value={language.code}>
                {languageOptionLabel(language)}
              </MenuItem>
            ))}
          </TextField>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={desktop ? 'permanent' : 'temporary'}
          open={desktop || drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              borderRight: '1px solid rgba(37, 107, 87, 0.12)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          boxSizing: 'border-box',
          pt: 10,
          px: { xs: 2, md: 4 },
          pb: 5,
        }}
      >
        {blockedItem ? (
          <Card>
            <CardContent>
              <Stack gap={2} alignItems="flex-start">
                <Alert severity="warning" sx={{ width: '100%' }}>
                  {adminText.shell.permissionDeniedNotice(blockedItemLabel)}
                </Alert>
                <Box>
                  <Typography variant="h4">{adminText.shell.permissionDenied}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {adminText.shell.permissionDeniedMessage}
                  </Typography>
                </Box>
                <Button variant="contained" component={Link} to="/admin">
                  {adminText.shell.backToDashboard}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Outlet context={{ adminLanguage, setAdminLanguage: changeAdminLanguage, adminText, currentUser: user, isAdmin: user.role === 'admin' } satisfies AdminOutletContext} />
        )}
      </Box>
    </Box>
  )
}
