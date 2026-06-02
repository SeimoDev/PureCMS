import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { LogIn } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { adminUIText } from '../adminI18n'
import { api, apiErrorMessage, authStorage } from '../api/client'
import { languageOptionLabel, languageStorageKey, normalizeLanguageCode, preferredLanguageFromEnvironment, supportedLanguages } from '../i18n'
import { documentDirectionForLanguage } from '../uiI18n'

function initialLoginLanguage() {
  return preferredLanguageFromEnvironment(localStorage, navigator.languages)
}

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [language, setLanguage] = useState(initialLoginLanguage)
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; message?: string } | null
  const message = state?.message ?? ''
  const ui = useMemo(() => adminUIText(language), [language])
  const documentDirection = documentDirectionForLanguage(language)

  useEffect(() => {
    document.documentElement.lang = normalizeLanguageCode(language)
    document.documentElement.dir = documentDirection
    return () => {
      document.documentElement.lang = 'zh-CN'
      document.documentElement.dir = 'ltr'
    }
  }, [documentDirection, language])

  if (authStorage.token) return <Navigate to="/admin" replace />

  function changeLanguage(value: string) {
    const code = normalizeLanguageCode(value)
    setLanguage(code)
    localStorage.setItem(languageStorageKey, code)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await api.login({ username, password })
      authStorage.setToken(result.token, result.expiresAt)
      navigate(state?.from || '/admin', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, ui.login.failure))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box dir={documentDirection} sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack component="form" gap={2.5} onSubmit={submit}>
            <Box>
              <Typography variant="h4">{ui.login.title}</Typography>
              <Typography color="text.secondary">{ui.login.subtitle}</Typography>
            </Box>
            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              size="small"
              label={ui.shell.languageLabel}
              value={language}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {supportedLanguages.map((language) => (
                <MenuItem key={language.code} value={language.code}>
                  {languageOptionLabel(language)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label={ui.login.username} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
            <TextField
              label={ui.login.password}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" variant="contained" size="large" startIcon={<LogIn size={18} />} disabled={submitting}>
              {ui.login.submit}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
