import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Clipboard, Save, Search, Trash2, Upload, X } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { countSelectedInPage, togglePageSelection, toggleSelection } from '../bulkSelection'
import AdminConfirmDialog from '../components/AdminConfirmDialog'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { commonUIText } from '../commonUII18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { mediaKindLabel, mediaKindOptionItems, mediaUploadAccept } from '../media'
import {
  bulkMediaDeleteBlockedMessage,
  isMediaReferenced,
  mediaDeleteDisabledReason,
  mediaUsageLabel,
  mediaUsageTone,
} from '../mediaUsage'
import { mediaPageUIText } from '../mediaPageI18n'
import { clampPage, pageCount } from '../pagination'
import type { MediaAsset } from '../types'

const mediaPageSize = 18

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  errorMessage: string
  action: () => Promise<void>
}

function formatBytes(value: number, locale: string) {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  if (value >= 1024 * 1024) {
    return `${formatter.format(value / 1024 / 1024)} MB`
  }
  return `${formatter.format(value / 1024)} KB`
}

export default function MediaPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => mediaPageUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(mediaPageSize)
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({})
  const [savingAltId, setSavingAltId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const kind = searchParams.get('kind') ?? ''
  const [keyword, setKeyword] = useState(query)
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const assetIds = assets.map((asset) => asset.id)
  const selectedInPage = countSelectedInPage(selectedIds, assetIds)
  const allCurrentPageSelected = assets.length > 0 && selectedInPage === assetIds.length
  const someCurrentPageSelected = selectedInPage > 0 && !allCurrentPageSelected
  const actionBusy = uploading || bulkBusy || confirmBusy
  const selectedReferencedCount = assets.filter((asset) => selectedIds.includes(asset.id) && isMediaReferenced(asset)).length

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .mediaPage({ q: query, kind, limit: mediaPageSize, page: currentPage })
      .then((value) => {
        setAssets(value.items)
        setTotal(value.total)
        setPageLimit(value.limit)
        setAltDrafts(Object.fromEntries(value.items.map((asset) => [asset.id, asset.altText])))
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }, [currentPage, kind, query, text.loadError])

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedIds([])
  }, [kind, query])

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setUploading(true)
    setNotice('')
    setError('')
    try {
      await api.uploadMedia(file, altText)
      setFile(null)
      setAltText('')
      setNotice(text.uploadedNotice)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.uploadError))
    } finally {
      setUploading(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    setSearchParams(params)
  }

  function changeKind(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set('kind', value)
    else params.delete('kind')
    params.delete('page')
    setSearchParams(params)
  }

  function changePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    setSearchParams(params)
  }

  function openConfirmDialog(next: ConfirmDialogState) {
    setConfirmDialog(next)
  }

  async function runConfirmDialogAction() {
    if (!confirmDialog || confirmBusy) return
    const action = confirmDialog.action
    const errorMessage = confirmDialog.errorMessage
    setConfirmBusy(true)
    setNotice('')
    setError('')
    try {
      await action()
      setConfirmDialog(null)
    } catch (err) {
      setError(apiErrorMessage(err, errorMessage))
    } finally {
      setConfirmBusy(false)
    }
  }

  function remove(asset: MediaAsset) {
    const disabledReason = mediaDeleteDisabledReason(asset, text.usage, adminLanguage)
    if (disabledReason) {
      setNotice('')
      setError(disabledReason)
      return
    }
    openConfirmDialog({
      message: text.deleteConfirm(asset.originalName),
      confirmLabel: text.deleteMedia,
      errorMessage: text.deleteError,
      action: async () => {
        await api.deleteMedia(asset.id)
        setSelectedIds((value) => value.filter((selectedId) => selectedId !== asset.id))
        setNotice(text.deletedNotice)
        load()
      },
    })
  }

  function toggleAssetPage(checked: boolean) {
    setSelectedIds((value) => togglePageSelection(value, assetIds, checked))
  }

  function toggleAsset(id: string) {
    setSelectedIds((value) => toggleSelection(value, id))
  }

  function bulkDeleteMedia() {
    const ids = [...selectedIds]
    if (ids.length === 0 || bulkBusy) return
    const blockedMessage = bulkMediaDeleteBlockedMessage(assets, ids, text.usage)
    if (blockedMessage) {
      setNotice('')
      setError(blockedMessage)
      return
    }
    openConfirmDialog({
      message: text.bulkDeleteConfirm(ids.length),
      confirmLabel: text.bulkDelete,
      errorMessage: text.bulkDeleteError,
      action: async () => {
        setBulkBusy(true)
        try {
          await Promise.all(ids.map((id) => api.deleteMedia(id)))
          setSelectedIds([])
          setNotice(text.bulkDeletedNotice)
          load()
        } finally {
          setBulkBusy(false)
        }
      },
    })
  }

  async function saveAltText(asset: MediaAsset) {
    setNotice('')
    setError('')
    setSavingAltId(asset.id)
    try {
      const updated = await api.updateMediaAltText(asset.id, altDrafts[asset.id] ?? '')
      setAssets((items) => items.map((item) => (item.id === updated.id ? updated : item)))
      setAltDrafts((current) => ({ ...current, [updated.id]: updated.altText }))
      setNotice(text.altSavedNotice)
    } catch (err) {
      setError(apiErrorMessage(err, text.altSaveError))
    } finally {
      setSavingAltId('')
    }
  }

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Chip label={text.totalFiles(total)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
      </Stack>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={2} onSubmit={submit}>
            <TextField
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={text.searchPlaceholder}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField select label={text.kindLabel} value={kind} onChange={(event) => changeKind(event.target.value)} sx={{ minWidth: 160 }}>
              {mediaKindOptionItems(text.kindLabels).map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="outlined" startIcon={<Search size={18} />}>
              {text.search}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }} onSubmit={upload}>
            <Button variant="outlined" component="label" startIcon={<Upload size={18} />}>
              {text.chooseFile}
              <input hidden type="file" accept={mediaUploadAccept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </Button>
            <Typography color="text.secondary" sx={{ minWidth: 180 }} noWrap title={file?.name}>
              {file ? file.name : text.noFile}
            </Typography>
            <TextField label={text.altText} value={altText} onChange={(event) => setAltText(event.target.value)} fullWidth />
            <Button type="submit" variant="contained" disabled={!file || uploading}>
              {text.upload}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {!loading && (selectedIds.length > 0 || assets.length > 0) && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" gap={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Checkbox
                  checked={allCurrentPageSelected}
                  indeterminate={someCurrentPageSelected}
                  onChange={(event) => toggleAssetPage(event.target.checked)}
                  disabled={assets.length === 0 || actionBusy}
                  inputProps={{ 'aria-label': text.selectCurrentPageMedia }}
                />
                <Box>
                  <Typography fontWeight={900}>{text.bulkTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.bulkSelected(selectedIds.length, selectedInPage, selectedReferencedCount)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={bulkDeleteMedia}
                  disabled={selectedIds.length === 0 || actionBusy}
                  startIcon={<Trash2 size={16} />}
                >
                  {text.bulkDelete}
                </Button>
                <Button size="small" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0 || actionBusy} startIcon={<X size={16} />}>
                  {text.clear}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingState label={text.loading} />
      ) : assets.length === 0 ? (
        <EmptyState title={query || kind ? text.emptyFiltered : text.empty} />
      ) : (
        <Stack gap={2}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' } }}>
            {assets.map((asset) => {
              const deleteDisabledReason = mediaDeleteDisabledReason(asset, text.usage, adminLanguage)
              return (
                <Card
                  key={asset.id}
                  sx={{
                    borderColor: selectedIds.includes(asset.id) ? 'primary.main' : undefined,
                    boxShadow: selectedIds.includes(asset.id) ? '0 0 0 1px rgba(37, 107, 87, 0.18)' : undefined,
                  }}
                >
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: 'rgba(37, 107, 87, 0.08)',
                      background: asset.mimeType.startsWith('image/') ? `url(${asset.url}) center/cover` : undefined,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {!asset.mimeType.startsWith('image/') && <Chip label={asset.mimeType} />}
                  </Box>
                  <CardContent>
                    <Stack gap={1.5}>
                      <Stack direction="row" gap={1} alignItems="flex-start">
                        <Checkbox
                          checked={selectedIds.includes(asset.id)}
                          onChange={() => toggleAsset(asset.id)}
                          disabled={actionBusy}
                          inputProps={{ 'aria-label': text.selectMedia(asset.originalName) }}
                          sx={{ mt: -0.75 }}
                        />
                        <Typography fontWeight={900} noWrap title={asset.originalName} sx={{ minWidth: 0 }}>
                          {asset.originalName}
                        </Typography>
                      </Stack>
                      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={mediaKindLabel(asset.mimeType, text.kindLabels)} />
                        <Chip
                          size="small"
                          label={mediaUsageLabel(asset.referenceCount, text.usage, adminLanguage)}
                          color={mediaUsageTone(asset.referenceCount)}
                          variant={asset.referenceCount > 0 ? 'filled' : 'outlined'}
                        />
                        <Chip size="small" label={formatBytes(asset.sizeBytes, text.locale)} />
                        <Chip size="small" label={formatDate(asset.createdAt, adminLanguage)} variant="outlined" />
                      </Stack>
                      <TextField size="small" value={asset.url} InputProps={{ readOnly: true }} />
                      <TextField
                        size="small"
                        label={text.altText}
                        value={altDrafts[asset.id] ?? ''}
                        helperText={text.altHelper}
                        multiline
                        minRows={2}
                        onChange={(event) => setAltDrafts((current) => ({ ...current, [asset.id]: event.target.value }))}
                      />
                      <Stack direction="row" justifyContent="flex-end" gap={1}>
                        <Tooltip title={text.copyUrl}>
                          <IconButton onClick={() => navigator.clipboard?.writeText(asset.url)} aria-label={text.copyUrl}>
                            <Clipboard size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={text.saveAlt}>
                          <IconButton
                            color="primary"
                            disabled={savingAltId === asset.id || (altDrafts[asset.id] ?? '') === asset.altText}
                            onClick={() => saveAltText(asset)}
                            aria-label={text.saveAlt}
                          >
                            <Save size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={deleteDisabledReason || text.deleteMedia}>
                          <span>
                            <IconButton
                              color="error"
                              disabled={actionBusy || isMediaReferenced(asset)}
                              onClick={() => remove(asset)}
                              aria-label={text.deleteMedia}
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  {text.paginationSummary(total, visiblePage, pages)}
                </Typography>
                <Pagination
                  count={pages}
                  page={visiblePage}
                  color="primary"
                  onChange={(_, value) => changePage(value)}
                  siblingCount={1}
                  boundaryCount={1}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
      <AdminConfirmDialog
        open={Boolean(confirmDialog)}
        title={commonText.destructiveAction}
        message={confirmDialog?.message ?? ''}
        cancelLabel={commonText.cancel}
        confirmLabel={confirmDialog?.confirmLabel ?? commonText.confirm}
        color="error"
        busy={confirmBusy || bulkBusy}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => void runConfirmDialogAction()}
      />
    </Stack>
  )
}
