import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Languages, LayoutGrid, List, Moon, Palette, Save, Sun, Wrench } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { appearanceAccentOptions, appearanceDefaults, normalizeAppearanceSettings } from '../appearance'
import { commentDefaults, normalizeCommentSettings } from '../commentSettings'
import LoadingState from '../components/LoadingState'
import { languageOptionLabel, supportedLanguages } from '../i18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { maintenanceUIText } from '../maintenanceI18n'
import { maintenanceDefaults, normalizeMaintenanceSettings } from '../maintenanceSettings'
import { settingsUIText } from '../settingsI18n'
import { normalizeTranslationSettings, translationDefaults } from '../translationSettings'
import type { SiteSettings } from '../types'

const defaults: SiteSettings = {
  site: {
    title: '',
    subtitle: '',
    icp: '',
    icpUrl: '',
    policeRecord: '',
    policeRecordUrl: '',
    logoText: '',
    wechat: '',
    email: '',
  },
  seo: {
    keywords: '',
    description: '',
    baiduSiteVerification: '',
    googleSiteVerification: '',
    bingSiteVerification: '',
    so360SiteVerification: '',
    sogouSiteVerification: '',
  },
  comment: {
    ...commentDefaults,
  },
  appearance: {
    ...appearanceDefaults,
  },
  translation: {
    ...translationDefaults,
  },
  maintenance: {
    ...maintenanceDefaults,
  },
}

export default function SettingsPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => settingsUIText(adminLanguage), [adminLanguage])
  const maintenanceText = useMemo(() => maintenanceUIText(adminLanguage), [adminLanguage])
  const [settings, setSettings] = useState<SiteSettings>(defaults)
  const [spamText, setSpamText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .settings()
      .then((value) => {
        const merged = {
          ...defaults,
          ...value,
          site: { ...defaults.site, ...value.site },
          seo: { ...defaults.seo, ...value.seo },
          comment: normalizeCommentSettings(value.comment),
          appearance: normalizeAppearanceSettings(value.appearance),
          translation: normalizeTranslationSettings(value.translation),
          maintenance: normalizeMaintenanceSettings(value.maintenance),
        }
        setSettings(merged)
        setSpamText((merged.comment?.spamKeywords ?? []).join('\n'))
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }, [text.loadError])

  function patch(section: keyof SiteSettings, value: Record<string, string | boolean | string[] | number>) {
    setSettings((current) => ({ ...current, [section]: { ...(current[section] as object), ...value } }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const spamKeywords = spamText
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
      const saved = await api.updateSettings({
        ...settings,
        appearance: normalizeAppearanceSettings(settings.appearance),
        comment: normalizeCommentSettings({ ...settings.comment, spamKeywords }),
        translation: normalizeTranslationSettings(settings.translation),
        maintenance: normalizeMaintenanceSettings(settings.maintenance),
      })
      const normalized = {
        ...saved,
        comment: normalizeCommentSettings(saved.comment),
        appearance: normalizeAppearanceSettings(saved.appearance),
        translation: normalizeTranslationSettings(saved.translation),
        maintenance: normalizeMaintenanceSettings(saved.maintenance),
      }
      setSettings(normalized)
      setSpamText((normalized.comment?.spamKeywords ?? []).join('\n'))
      setNotice(text.savedNotice)
    } catch (err) {
      setError(apiErrorMessage(err, text.saveError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label={text.loading} />

  return (
    <Stack component="form" gap={3} onSubmit={submit}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Button type="submit" variant="contained" startIcon={<Save size={18} />} disabled={saving}>
          {text.save}
        </Button>
      </Stack>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
        <Card>
          <CardContent>
            <Stack gap={2}>
              <Typography variant="h6">{text.siteProfile}</Typography>
              <TextField label={text.siteTitle} value={settings.site?.title ?? ''} onChange={(event) => patch('site', { title: event.target.value })} />
              <TextField label={text.siteSubtitle} value={settings.site?.subtitle ?? ''} onChange={(event) => patch('site', { subtitle: event.target.value })} />
              <TextField label={text.logoText} value={settings.site?.logoText ?? ''} onChange={(event) => patch('site', { logoText: event.target.value })} />
              <TextField label={text.icp} value={settings.site?.icp ?? ''} onChange={(event) => patch('site', { icp: event.target.value })} />
              <TextField label={text.icpUrl ?? text.icp} value={settings.site?.icpUrl ?? ''} onChange={(event) => patch('site', { icpUrl: event.target.value })} />
              <TextField label={text.policeRecord} value={settings.site?.policeRecord ?? ''} onChange={(event) => patch('site', { policeRecord: event.target.value })} />
              <TextField
                label={text.policeRecordUrl ?? text.policeRecord}
                value={settings.site?.policeRecordUrl ?? ''}
                onChange={(event) => patch('site', { policeRecordUrl: event.target.value })}
              />
              <TextField label={text.wechat} value={settings.site?.wechat ?? ''} onChange={(event) => patch('site', { wechat: event.target.value })} />
              <TextField label={text.email} value={settings.site?.email ?? ''} onChange={(event) => patch('site', { email: event.target.value })} />
            </Stack>
          </CardContent>
        </Card>

        <Stack gap={3}>
          <Card>
            <CardContent>
              <Stack gap={2}>
                <Stack direction="row" gap={1} alignItems="center">
                  <Wrench size={18} />
                  <Typography variant="h6">{maintenanceText.settingsTitle}</Typography>
                </Stack>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.maintenance?.enabled ?? maintenanceDefaults.enabled}
                        onChange={(event) => patch('maintenance', { enabled: event.target.checked })}
                      />
                    }
                    label={maintenanceText.settingsEnabled}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {maintenanceText.settingsDescription}
                  </Typography>
                </Box>
                <TextField
                  label={maintenanceText.messageLabel}
                  value={settings.maintenance?.message ?? ''}
                  onChange={(event) => patch('maintenance', { message: event.target.value })}
                  helperText={maintenanceText.messageHelper}
                  multiline
                  minRows={3}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <Stack direction="row" gap={1} alignItems="center">
                  <Languages size={18} />
                  <Typography variant="h6">{text.translationTitle}</Typography>
                </Stack>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.translation?.enabled ?? translationDefaults.enabled}
                        onChange={(event) => patch('translation', { enabled: event.target.checked })}
                      />
                    }
                    label={text.translationEnabled}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {text.translationDescription}
                  </Typography>
                </Box>
                <TextField
                  label={text.provider}
                  value={settings.translation?.provider ?? translationDefaults.provider}
                  onChange={(event) => patch('translation', { provider: event.target.value })}
                />
                <TextField
                  label={text.endpoint}
                  value={settings.translation?.endpoint ?? translationDefaults.endpoint}
                  onChange={(event) => patch('translation', { endpoint: event.target.value })}
                />
                <TextField
                  label={text.model}
                  value={settings.translation?.model ?? translationDefaults.model}
                  onChange={(event) => patch('translation', { model: event.target.value })}
                />
                <TextField
                  label={text.apiKey}
                  type="password"
                  value={settings.translation?.apiKey ?? ''}
                  onChange={(event) => patch('translation', { apiKey: event.target.value })}
                  helperText={text.apiKeyHelper}
                />
                <TextField
                  label={text.timeoutSeconds}
                  type="number"
                  value={settings.translation?.timeoutSeconds ?? translationDefaults.timeoutSeconds}
                  onChange={(event) => patch('translation', { timeoutSeconds: Number(event.target.value) })}
                  inputProps={{ min: 5, max: 120 }}
                />
                <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                  {supportedLanguages.map((language) => (
                    <Chip key={language.code} size="small" label={languageOptionLabel(language)} variant="outlined" />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <Typography variant="h6">{text.seoTitle}</Typography>
                <TextField label={text.seoKeywords} value={settings.seo?.keywords ?? ''} onChange={(event) => patch('seo', { keywords: event.target.value })} />
                <TextField
                  label={text.seoDescription}
                  value={settings.seo?.description ?? ''}
                  onChange={(event) => patch('seo', { description: event.target.value })}
                  multiline
                  minRows={4}
                />
                <Typography variant="subtitle2" fontWeight={900}>
                  {text.webmasterVerification}
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <TextField
                    label={text.baiduVerification}
                    value={settings.seo?.baiduSiteVerification ?? ''}
                    onChange={(event) => patch('seo', { baiduSiteVerification: event.target.value })}
                  />
                  <TextField
                    label={text.so360Verification}
                    value={settings.seo?.so360SiteVerification ?? ''}
                    onChange={(event) => patch('seo', { so360SiteVerification: event.target.value })}
                  />
                  <TextField
                    label={text.sogouVerification}
                    value={settings.seo?.sogouSiteVerification ?? ''}
                    onChange={(event) => patch('seo', { sogouSiteVerification: event.target.value })}
                  />
                  <TextField
                    label={text.bingVerification}
                    value={settings.seo?.bingSiteVerification ?? ''}
                    onChange={(event) => patch('seo', { bingSiteVerification: event.target.value })}
                  />
                  <TextField
                    label={text.googleVerification}
                    value={settings.seo?.googleSiteVerification ?? ''}
                    onChange={(event) => patch('seo', { googleSiteVerification: event.target.value })}
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <Stack direction="row" gap={1} alignItems="center">
                  <Palette size={18} />
                  <Typography variant="h6">{text.appearanceTitle}</Typography>
                </Stack>
                <TextField
                  select
                  label={text.themeMode}
                  value={settings.appearance?.themeMode ?? appearanceDefaults.themeMode}
                  onChange={(event) => patch('appearance', { themeMode: event.target.value })}
                >
                  <MenuItem value="light">
                    <Stack direction="row" gap={1} alignItems="center">
                      <Sun size={16} />
                      {text.light}
                    </Stack>
                  </MenuItem>
                  <MenuItem value="dark">
                    <Stack direction="row" gap={1} alignItems="center">
                      <Moon size={16} />
                      {text.dark}
                    </Stack>
                  </MenuItem>
                </TextField>
                <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                  {appearanceAccentOptions.map((option) => {
                    const selected = (settings.appearance?.accentColor ?? appearanceDefaults.accentColor) === option.value
                    return (
                      <Button
                        key={option.value}
                        variant={selected ? 'contained' : 'outlined'}
                        onClick={() => patch('appearance', { accentColor: option.value })}
                        startIcon={
                          <Box
                            sx={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              bgcolor: option.value,
                              border: '1px solid rgba(0,0,0,0.16)',
                            }}
                          />
                        }
                      >
                        {text.accentLabels[option.value]}
                      </Button>
                    )
                  })}
                </Stack>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <TextField
                    select
                    label={text.homeLayout}
                    value={settings.appearance?.homeLayout ?? appearanceDefaults.homeLayout}
                    onChange={(event) => patch('appearance', { homeLayout: event.target.value })}
                  >
                    <MenuItem value="cards">
                      <Stack direction="row" gap={1} alignItems="center">
                        <LayoutGrid size={16} />
                        {text.cards}
                      </Stack>
                    </MenuItem>
                    <MenuItem value="list">
                      <Stack direction="row" gap={1} alignItems="center">
                        <List size={16} />
                        {text.list}
                      </Stack>
                    </MenuItem>
                  </TextField>
                  <TextField
                    select
                    label={text.coverStyle}
                    value={settings.appearance?.coverStyle ?? appearanceDefaults.coverStyle}
                    onChange={(event) => patch('appearance', { coverStyle: event.target.value })}
                  >
                    <MenuItem value="image">{text.coverImage}</MenuItem>
                    <MenuItem value="plain">{text.coverPlain}</MenuItem>
                  </TextField>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <Typography variant="h6">{text.commentTitle}</Typography>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.comment?.enabled ?? commentDefaults.enabled}
                        onChange={(event) => patch('comment', { enabled: event.target.checked })}
                      />
                    }
                    label={text.commentsEnabled}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {text.commentsDescription}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={Boolean(settings.comment?.moderation)} onChange={(event) => patch('comment', { moderation: event.target.checked })} />}
                  label={text.moderation}
                />
                <TextField
                  label={text.spamKeywords}
                  value={spamText}
                  onChange={(event) => setSpamText(event.target.value)}
                  helperText={text.spamKeywordsHelper}
                  multiline
                  minRows={4}
                />
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <TextField
                    label={text.rateLimitWindow}
                    type="number"
                    value={settings.comment?.rateLimitWindowMinutes ?? commentDefaults.rateLimitWindowMinutes}
                    onChange={(event) => patch('comment', { rateLimitWindowMinutes: Number(event.target.value) })}
                    helperText={text.rateLimitWindowHelper}
                    inputProps={{ min: 1, max: 1440 }}
                  />
                  <TextField
                    label={text.rateLimitMax}
                    type="number"
                    value={settings.comment?.rateLimitMax ?? commentDefaults.rateLimitMax}
                    onChange={(event) => patch('comment', { rateLimitMax: Number(event.target.value) })}
                    helperText={text.rateLimitMaxHelper}
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Box>
                <TextField
                  label={text.commentNotice}
                  value={settings.comment?.notice ?? ''}
                  onChange={(event) => patch('comment', { notice: event.target.value })}
                  multiline
                  minRows={3}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Stack>
  )
}
