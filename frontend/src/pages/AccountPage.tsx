import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { KeyRound, Save, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { api, apiErrorMessage, authStorage } from '../api/client'
import { formatDateTime } from '../components/format'
import LoadingState from '../components/LoadingState'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { isStrongPassword, passwordPolicyHelperText } from '../passwordPolicy'
import type { User } from '../types'

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { adminLanguage, adminText } = useOutletContext<AdminOutletContext>()
  const passwordPolicyLabel = passwordPolicyHelperText(adminLanguage)

  useEffect(() => {
    api
      .me()
      .then((value) => {
        setUser(value)
        setDisplayName(value.displayName)
      })
      .catch((err) => setError(apiErrorMessage(err, adminText.account.readFailed)))
      .finally(() => setLoading(false))
  }, [adminText.account.readFailed])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSavingProfile(true)
    try {
      const value = await api.updateMyProfile({ displayName })
      setUser(value)
      setDisplayName(value.displayName)
      setNotice(adminText.account.profileSaved)
    } catch (err) {
      setError(apiErrorMessage(err, adminText.account.profileFailed))
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setError('')
    if (newPassword !== confirmPassword) {
      setError(adminText.account.passwordMismatch)
      return
    }
    if (!isStrongPassword(newPassword)) {
      setError(passwordPolicyLabel)
      return
    }
    setSavingPassword(true)
    try {
      await api.updateMyPassword({ currentPassword, newPassword })
      authStorage.clear()
      navigate('/login', { replace: true, state: { message: adminText.account.passwordUpdated } })
    } catch (err) {
      setError(apiErrorMessage(err, adminText.account.passwordFailed))
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <LoadingState label={adminText.account.loading} />

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h4">{adminText.account.title}</Typography>
        <Typography color="text.secondary">{adminText.account.subtitle}</Typography>
      </Box>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 0.9fr) minmax(360px, 1.1fr)' } }}>
        <Card>
          <CardContent>
            <Stack gap={2.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                <Typography variant="h6">{adminText.account.identity}</Typography>
                <Chip icon={<ShieldCheck size={16} />} label={user?.role === 'admin' ? adminText.shell.roleAdmin : adminText.shell.roleEditor} color="primary" />
              </Stack>
              <Divider />
              <Stack gap={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {adminText.account.username}
                  </Typography>
                  <Typography fontWeight={900}>{user?.username}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {adminText.account.status}
                  </Typography>
                  <Typography fontWeight={900}>{user?.status === 'active' ? adminText.account.enabled : adminText.account.disabled}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {adminText.account.lastLogin}
                  </Typography>
                  <Typography fontWeight={900}>{user?.lastLoginAt ? formatDateTime(user.lastLoginAt, adminLanguage) : adminText.account.neverLoggedIn}</Typography>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack gap={3}>
          <Card>
            <CardContent>
              <Stack component="form" gap={2} onSubmit={saveProfile}>
                <Typography variant="h6">{adminText.account.profile}</Typography>
                <TextField
                  required
                  label={adminText.account.displayName}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  helperText={adminText.account.displayNameHelper}
                />
                <Button type="submit" variant="contained" startIcon={<Save size={18} />} disabled={savingProfile}>
                  {adminText.account.saveProfile}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack component="form" gap={2} onSubmit={savePassword}>
                <Typography variant="h6">{adminText.account.changePassword}</Typography>
                <TextField
                  required
                  type="password"
                  label={adminText.account.currentPassword}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
                <TextField
                  required
                  type="password"
                  label={adminText.account.newPassword}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  helperText={passwordPolicyLabel}
                />
                <TextField
                  required
                  type="password"
                  label={adminText.account.confirmPassword}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <Button type="submit" variant="outlined" startIcon={<KeyRound size={18} />} disabled={savingPassword}>
                  {adminText.account.updatePassword}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Stack>
  )
}
