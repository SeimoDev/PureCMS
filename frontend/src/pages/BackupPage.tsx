import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material'
import { Download, ShieldAlert, Upload } from 'lucide-react'
import { ChangeEvent, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { backupImportFileTooLarge, backupMediaStats, backupSnapshotRecordCount, formatBackupBytes, maxBackupImportBytes } from '../backup'
import { backupPageUIText, type BackupRecordLabels } from '../backupPageI18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import type { BackupImportResult, BackupSnapshot } from '../types'

type PendingImport = {
  filename: string
  snapshot: BackupSnapshot
}

function saveJSON(snapshot: BackupSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cms-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function BackupPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => backupPageUIText(adminLanguage), [adminLanguage])
  const [snapshot, setSnapshot] = useState<BackupSnapshot | null>(null)
  const [importResult, setImportResult] = useState<BackupImportResult | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parsingImport, setParsingImport] = useState(false)
  const [error, setError] = useState('')

  const mediaStats = useMemo(() => backupMediaStats(snapshot), [snapshot])
  const mediaCoverage = mediaStats.total > 0 ? Math.round((mediaStats.embedded / mediaStats.total) * 100) : 100
  const pendingMediaStats = useMemo(() => backupMediaStats(pendingImport?.snapshot), [pendingImport])
  const pendingRecordCount = useMemo(() => backupSnapshotRecordCount(pendingImport?.snapshot), [pendingImport])

  async function exportBackup() {
    setLoading(true)
    setError('')
    try {
      const value = await api.exportBackup()
      setSnapshot(value)
      saveJSON(value)
    } catch (err) {
      setError(apiErrorMessage(err, text.exportError))
    } finally {
      setLoading(false)
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (backupImportFileTooLarge(file.size)) {
      setError(`${text.importError}: ${formatBackupBytes(file.size, text.locale)} > ${formatBackupBytes(maxBackupImportBytes, text.locale)}`)
      return
    }
    setParsingImport(true)
    setError('')
    setImportResult(null)
    setPendingImport(null)
    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw) as BackupSnapshot
      setPendingImport({ filename: file.name, snapshot: parsed })
    } catch (err) {
      setError(apiErrorMessage(err, text.importError))
    } finally {
      setParsingImport(false)
    }
  }

  async function confirmImportBackup() {
    if (!pendingImport) return
    setImporting(true)
    setError('')
    setImportResult(null)
    try {
      const result = await api.importBackup(pendingImport.snapshot)
      setImportResult(result)
      setPendingImport(null)
    } catch (err) {
      setError(apiErrorMessage(err, text.importError))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h4">{text.title}</Typography>
        <Typography color="text.secondary">{text.subtitle}</Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      <Alert severity="warning" icon={<ShieldAlert size={20} />}>
        {text.warning}
      </Alert>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack gap={2} alignItems="flex-start">
              <Typography variant="h6">{text.exportTitle}</Typography>
              <Typography sx={{ lineHeight: 1.8 }} color="text.secondary">
                {text.exportDescription}
              </Typography>
              <Button variant="contained" startIcon={<Download size={18} />} onClick={exportBackup} disabled={loading}>
                {loading ? text.exporting : text.exportButton}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack gap={2} alignItems="flex-start">
              <Typography variant="h6">{text.importTitle}</Typography>
              <Typography sx={{ lineHeight: 1.8 }} color="text.secondary">
                {text.importDescription}
              </Typography>
              <Button variant="outlined" component="label" startIcon={<Upload size={18} />} disabled={importing || parsingImport}>
                {parsingImport ? text.parsingImport : importing ? text.importing : text.importButton}
                <input hidden type="file" accept="application/json,.json" onChange={importBackup} />
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {snapshot && (
        <Card>
          <CardContent>
            <Stack gap={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
                <Box>
                  <Typography variant="h6">{text.recentExportTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.exportedAt(new Date(snapshot.exportedAt).toLocaleString(text.locale))}
                  </Typography>
                </Box>
                <Chip color={mediaStats.missing > 0 ? 'warning' : 'success'} label={text.mediaFiles(mediaStats.embedded, mediaStats.total)} />
              </Stack>

              <Box>
                <LinearProgress variant="determinate" value={mediaCoverage} sx={{ height: 8, borderRadius: 999 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {text.embeddedMedia(formatBackupBytes(mediaStats.bytes, text.locale), mediaStats.missing)}
                </Typography>
              </Box>

              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {backupSnapshotChips(snapshot, text.record).map((item) => (
                  <Chip key={item.key} label={text.count(item.label, item.count)} />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardContent>
            <Stack gap={2}>
              <Typography variant="h6">{text.importResultTitle}</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {backupImportChips(importResult, text.record).map((item, index) => (
                  <Chip key={item.key} color={index === 0 ? 'success' : 'default'} label={text.count(item.label, item.count)} />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(pendingImport)} onClose={() => !importing && setPendingImport(null)} fullWidth maxWidth="md">
        <DialogTitle>{text.pendingImportTitle}</DialogTitle>
        <DialogContent>
          {pendingImport && (
            <Stack gap={2} sx={{ pt: 1 }}>
              <Alert severity="warning" icon={<ShieldAlert size={20} />}>
                {text.warning}
              </Alert>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {text.selectedFile}
                </Typography>
                <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
                  {pendingImport.filename}
                </Typography>
              </Box>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Chip color="primary" label={text.pendingImportSubtitle(pendingRecordCount)} />
                <Chip color={pendingMediaStats.missing > 0 ? 'warning' : 'success'} label={text.mediaFiles(pendingMediaStats.embedded, pendingMediaStats.total)} />
                <Chip label={text.embeddedMedia(formatBackupBytes(pendingMediaStats.bytes, text.locale), pendingMediaStats.missing)} />
              </Stack>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {backupSnapshotChips(pendingImport.snapshot, text.record).map((item) => (
                  <Chip key={item.key} variant="outlined" label={text.count(item.label, item.count)} />
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingImport(null)} disabled={importing}>
            {text.cancelImport}
          </Button>
          <Button variant="contained" color="warning" onClick={confirmImportBackup} disabled={importing}>
            {importing ? text.importing : text.confirmImport}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function backupSnapshotChips(snapshot: BackupSnapshot, labels: BackupRecordLabels) {
  return [
    { key: 'posts', label: labels.posts, count: snapshot.posts.length },
    { key: 'pages', label: labels.pages, count: snapshot.pages?.length ?? 0 },
    { key: 'postRevisions', label: labels.postRevisions, count: snapshot.postRevisions.length },
    { key: 'pageRevisions', label: labels.pageRevisions, count: snapshot.pageRevisions?.length ?? 0 },
    { key: 'postTranslations', label: labels.postTranslations, count: snapshot.postTranslations?.length ?? 0 },
    { key: 'postTranslationJobs', label: labels.postTranslationJobs ?? labels.postTranslations, count: snapshot.postTranslationJobs?.length ?? 0 },
    { key: 'comments', label: labels.comments, count: snapshot.comments.length },
    { key: 'mediaAssets', label: labels.mediaAssets, count: snapshot.mediaAssets.length },
    { key: 'friendLinks', label: labels.friendLinks, count: snapshot.friendLinks?.length ?? 0 },
    { key: 'viewStats', label: labels.viewStats, count: snapshot.viewStats?.length ?? 0 },
    { key: 'users', label: labels.users, count: snapshot.users.length },
    { key: 'activityLogs', label: labels.activityLogs, count: snapshot.activityLogs.length },
  ]
}

function backupImportChips(result: BackupImportResult, labels: BackupRecordLabels) {
  return [
    { key: 'posts', label: labels.posts, count: result.posts },
    { key: 'pages', label: labels.pages, count: result.pages },
    { key: 'postRevisions', label: labels.postRevisions, count: result.postRevisions },
    { key: 'pageRevisions', label: labels.pageRevisions, count: result.pageRevisions },
    { key: 'postTranslations', label: labels.postTranslations, count: result.postTranslations },
    { key: 'postTranslationJobs', label: labels.postTranslationJobs ?? labels.postTranslations, count: result.postTranslationJobs ?? 0 },
    { key: 'categories', label: labels.categories, count: result.categories },
    { key: 'tags', label: labels.tags, count: result.tags },
    { key: 'comments', label: labels.comments, count: result.comments },
    { key: 'mediaAssets', label: labels.mediaAssets, count: result.mediaAssets },
    { key: 'friendLinks', label: labels.friendLinks, count: result.friendLinks },
    { key: 'viewStats', label: labels.viewStats, count: result.viewStats },
    { key: 'users', label: labels.users, count: result.users },
    { key: 'activityLogs', label: labels.activityLogs, count: result.activityLogs },
  ]
}
