import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, Stack, TextField, Typography } from '@mui/material'
import { Activity, Database, FolderCheck, HardDrive, Languages, RefreshCw, ServerCog, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import AdminConfirmDialog from '../components/AdminConfirmDialog'
import { compactNumber, formatDateTime } from '../components/format'
import LoadingState from '../components/LoadingState'
import { commonUIText } from '../commonUII18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { deploymentCheckText, systemPageUIText, type SystemPageUIText } from '../systemPageI18n'
import {
  activityLogRetentionLabel,
  defaultActivityLogRetentionDays,
  formatSystemBytes,
  formatUptimeSeconds,
  normalizeActivityLogRetentionDays,
  normalizeSystemStatusPayload,
  systemChecklist,
  systemStatusTone,
} from '../systemStatus'
import type { SystemStatus } from '../types'

type ContentMetric = {
  key: keyof SystemStatus['content']
  label: string
  to?: string
}

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  action: () => Promise<void>
}

export default function SystemPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => systemPageUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const contentMetrics = useMemo(() => systemContentMetrics(text), [text])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [maintenanceBusy, setMaintenanceBusy] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [retentionDays, setRetentionDays] = useState(defaultActivityLogRetentionDays)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const checks = useMemo(() => (status ? systemChecklist(status, text.system, text.locale) : []), [status, text])
  const healthyChecks = checks.filter((check) => check.ok).length
  const healthScore = checks.length > 0 ? Math.round((healthyChecks / checks.length) * 100) : 0

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      setStatus(normalizeSystemStatusPayload(await api.systemStatus()))
    } catch (err) {
      setError(apiErrorMessage(err, text.loadError))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [text.loadError])

  function openConfirmDialog(next: ConfirmDialogState) {
    setConfirmDialog(next)
  }

  async function runConfirmDialogAction() {
    if (!confirmDialog || confirmBusy) return
    const action = confirmDialog.action
    setConfirmBusy(true)
    setNotice('')
    setError('')
    try {
      await action()
      setConfirmDialog(null)
    } catch (err) {
      setError(apiErrorMessage(err, text.cleanError))
    } finally {
      setConfirmBusy(false)
    }
  }

  function pruneActivityLogs() {
    if (!status || maintenanceBusy || confirmBusy) return
    const days = normalizeActivityLogRetentionDays(retentionDays)
    openConfirmDialog({
      message: text.cleanConfirm(days),
      confirmLabel: text.cleanOldLogs,
      action: async () => {
        await pruneActivityLogsImmediately(days)
      },
    })
  }

  async function pruneActivityLogsImmediately(days: number) {
    setMaintenanceBusy(true)
    setNotice('')
    setError('')
    try {
      const result = await api.deleteOldActivityLogs(days)
      setNotice(text.cleanNotice(result.deleted, result.retentionDays))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.cleanError))
    } finally {
      setMaintenanceBusy(false)
    }
  }

  useEffect(() => {
    load(true)
  }, [load])

  if (loading) return <LoadingState label={text.loading} />

  if (!status) {
    return (
      <Stack gap={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Button variant="contained" onClick={() => load(true)}>
          {text.retry}
        </Button>
      </Stack>
    )
  }

  const databaseTone = systemStatusTone(status.database.status, text.system)
  const storageTone = systemStatusTone(status.storage.status, text.system)
  const deploymentTone = systemStatusTone(status.deployment.status, text.system)
  const normalizedRetentionDays = normalizeActivityLogRetentionDays(retentionDays)

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Button variant="contained" startIcon={<RefreshCw size={18} />} onClick={() => load()} disabled={refreshing}>
          {refreshing ? text.refreshing : text.refresh}
        </Button>
      </Stack>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
              <Stack direction="row" gap={1.5} alignItems="center">
                <ServerCog size={28} />
                <Box>
                  <Typography variant="h5">{text.overview}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.generatedAt(formatDateTime(status.generatedAt, adminLanguage))}
                  </Typography>
                </Box>
              </Stack>
              <Chip color={healthScore === 100 ? 'success' : 'warning'} label={text.healthItems(healthyChecks, checks.length)} />
            </Stack>
            <LinearProgress variant="determinate" value={healthScore} sx={{ height: 8, borderRadius: 999 }} />
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Chip variant="outlined" label={text.started(formatDateTime(status.runtime.startedAt, adminLanguage))} />
              <Chip color="primary" variant="outlined" label={text.uptime(formatUptimeSeconds(status.runtime.uptimeSeconds, text.system))} />
              <Chip variant="outlined" label={status.runtime.goVersion} />
              <Chip variant="outlined" label={`${status.runtime.os}/${status.runtime.arch}`} />
              <Chip variant="outlined" label={`PID ${status.runtime.processId}`} />
            </Stack>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' } }}>
              {checks.map((check) => (
                <Stack key={check.key} gap={0.75} sx={{ minWidth: 0 }}>
                  <Chip size="small" color={check.ok ? 'success' : 'warning'} label={check.ok ? text.passed : text.actionRequired} sx={{ alignSelf: 'flex-start' }} />
                  <Typography fontWeight={800}>{check.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {check.detail}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' } }}>
        <Card>
          <CardContent>
            <Stack gap={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" gap={1.25} alignItems="center">
                  <Database size={22} />
                  <Typography variant="h6">{text.database}</Typography>
                </Stack>
                <Chip color={databaseTone.color} label={databaseTone.label} />
              </Stack>
              <Typography variant="h3">{status.database.latencyMs} ms</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Chip variant="outlined" label={text.totalConnections(status.database.totalConns)} />
                <Chip variant="outlined" label={text.acquiredConnections(status.database.acquiredConns)} />
                <Chip variant="outlined" label={text.idleConnections(status.database.idleConns)} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack gap={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" gap={1.25} alignItems="center">
                  <HardDrive size={22} />
                  <Typography variant="h6">{text.storage}</Typography>
                </Stack>
                <Chip color={storageTone.color} label={storageTone.label} />
              </Stack>
              <Typography variant="h3">{formatSystemBytes(status.storage.totalBytes, text.locale)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {status.storage.uploadDir}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<FolderCheck size={14} />} variant="outlined" label={text.files(status.storage.fileCount)} />
                <Chip color={status.storage.writable ? 'success' : 'warning'} label={status.storage.writable ? text.writable : text.notWritable} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack gap={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" gap={1.25} alignItems="center">
                  <Languages size={22} />
                  <Typography variant="h6">{text.translation}</Typography>
                </Stack>
                <Chip color={status.translation.enabled ? 'primary' : 'default'} label={status.translation.enabled ? text.enabled : text.disabled} />
              </Stack>
              <Typography variant="h3">{compactNumber(status.translation.cacheCount, adminLanguage)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {status.translation.provider} / {status.translation.model}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Chip color={status.translation.apiKeyConfigured ? 'success' : 'warning'} label={status.translation.apiKeyConfigured ? text.apiKeyConfigured : text.apiKeyMissing} />
                <Chip component={Link} to="/admin/translations" clickable variant="outlined" label={text.staleCaches(status.translation.staleCacheCount)} />
                {status.translation.runningJobCount > 0 && (
                  <Chip component={Link} to="/admin/translations" clickable color="info" variant="outlined" label={text.runningTranslationJobs?.(status.translation.runningJobCount)} />
                )}
                {status.translation.failedJobCount > 0 && (
                  <Chip component={Link} to="/admin/translations" clickable color="error" variant="outlined" label={text.failedTranslationJobs?.(status.translation.failedJobCount)} />
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack gap={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" gap={1.25} alignItems="center">
                  <ShieldCheck size={22} />
                  <Typography variant="h6">{text.deployment}</Typography>
                </Stack>
                <Chip color={deploymentTone.color} label={deploymentTone.label} />
              </Stack>
              <Stack gap={1}>
                {status.deployment.checks.map((check) => {
                  const localized = deploymentCheckText(check, text)
                  return (
                    <Stack key={check.key} direction="row" gap={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                      <Chip size="small" color={check.ok ? 'success' : 'warning'} label={check.ok ? text.passed : text.actionRequired} sx={{ mt: 0.25, minWidth: 54 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={800}>
                          {localized.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-word' }}>
                          {localized.detail}
                        </Typography>
                      </Box>
                    </Stack>
                  )
                })}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack direction="row" gap={1.25} alignItems="center">
              <Activity size={22} />
              <Typography variant="h6">{text.contentData}</Typography>
            </Stack>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', xl: 'repeat(10, 1fr)' } }}>
              {contentMetrics.map((metric) => (
                <Box
                  key={metric.key}
                  component={metric.to ? Link : 'div'}
                  to={metric.to}
                  sx={{
                    color: 'inherit',
                    minWidth: 0,
                    textDecoration: 'none',
                    borderRadius: 2,
                    p: metric.to ? 1.25 : 0,
                    mx: metric.to ? -1.25 : 0,
                    transition: 'background-color 160ms ease',
                    '&:hover': metric.to ? { bgcolor: 'action.hover' } : undefined,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={900}>
                    {compactNumber(status.content[metric.key], adminLanguage)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h6">{text.maintenance}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {activityLogRetentionLabel(normalizedRetentionDays, status.content.activityLogs, text.system)}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                <TextField
                  type="number"
                  label={text.retentionDays}
                  value={retentionDays}
                  onChange={(event) => setRetentionDays(Number(event.target.value))}
                  inputProps={{ min: 7, max: 3650 }}
                  sx={{ width: { xs: '100%', sm: 140 } }}
                />
                <Button color="warning" variant="outlined" startIcon={<Trash2 size={18} />} onClick={pruneActivityLogs} disabled={maintenanceBusy || confirmBusy}>
                  {maintenanceBusy ? text.cleaning : text.cleanOldLogs}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <AdminConfirmDialog
        open={Boolean(confirmDialog)}
        title={commonText.destructiveAction}
        message={confirmDialog?.message ?? ''}
        cancelLabel={commonText.cancel}
        confirmLabel={confirmDialog?.confirmLabel ?? commonText.confirm}
        color="warning"
        busy={maintenanceBusy || confirmBusy}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => void runConfirmDialogAction()}
      />
    </Stack>
  )
}

function systemContentMetrics(text: SystemPageUIText): ContentMetric[] {
  return [
    { key: 'posts', label: text.contentLabels.posts },
    { key: 'trashedPosts', label: text.contentLabels.trashedPosts, to: '/admin/posts?deleted=1' },
    { key: 'pages', label: text.contentLabels.pages },
    { key: 'trashedPages', label: text.contentLabels.trashedPages, to: '/admin/pages?deleted=1' },
    { key: 'mediaAssets', label: text.contentLabels.mediaAssets },
    { key: 'comments', label: text.contentLabels.comments },
    { key: 'users', label: text.contentLabels.users },
    { key: 'activityLogs', label: text.contentLabels.activityLogs },
    { key: 'translationCaches', label: text.contentLabels.translationCaches, to: '/admin/translations' },
    { key: 'staleTranslationCaches', label: text.contentLabels.staleTranslationCaches, to: '/admin/translations' },
    { key: 'translationJobs', label: text.contentLabels.translationJobs ?? text.contentLabels.translationCaches, to: '/admin/translations' },
    { key: 'failedTranslationJobs', label: text.contentLabels.failedTranslationJobs ?? text.contentLabels.staleTranslationCaches, to: '/admin/translations' },
  ]
}
