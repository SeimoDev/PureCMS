import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Languages, RefreshCw, Search, Trash2 } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import AdminConfirmDialog from '../components/AdminConfirmDialog'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { PostStatusChip } from '../components/StatusChip'
import { commonUIText } from '../commonUII18n'
import { languageByCode, languageOptionLabel, supportedLanguages } from '../i18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { clampPage, pageCount } from '../pagination'
import { translationBackfillNotice, translationCacheDeletePrompt, translationCacheStatus, translationCacheSummary } from '../translationCache'
import { translationsPageUIText } from '../translationsPageI18n'
import type { TranslationCacheItem } from '../types'

const translationCachePageSize = 12

type ConfirmDialogState = {
  title: string
  message: string
  confirmLabel: string
  color: 'primary' | 'warning' | 'error'
  errorMessage: string
  action: () => Promise<void>
}

function languageLabel(code: string) {
  return languageOptionLabel(languageByCode(code))
}

function formatCacheBytes(value: number, locale: string) {
  if (value >= 1024 * 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1024 / 1024)} MB`
  }
  if (value >= 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1024)} KB`
  }
  return `${new Intl.NumberFormat(locale).format(value)} B`
}

export default function TranslationsPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => translationsPageUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const [items, setItems] = useState<TranslationCacheItem[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(translationCachePageSize)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [cleaning, setCleaning] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const lang = searchParams.get('lang') ?? ''
  const source = searchParams.get('source') ?? ''
  const [keyword, setKeyword] = useState(query)
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const summary = useMemo(() => translationCacheSummary(items, text.cache), [items, text.cache])
  const actionBusy = Boolean(busyId) || cleaning || backfilling || confirmBusy

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .translationCachesPage({ q: query, lang, source, limit: translationCachePageSize, page: currentPage })
      .then((page) => {
        setItems(page.items)
        setTotal(page.total)
        setPageLimit(page.limit)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }, [currentPage, lang, query, source, text.loadError])

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    setSearchParams(params)
  }

  function patchFilter(name: 'lang' | 'source', value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(name, value)
    else params.delete(name)
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

  function remove(item: TranslationCacheItem) {
    openConfirmDialog({
      title: commonText.destructiveAction,
      message: translationCacheDeletePrompt(item, text.cache),
      confirmLabel: text.deleteCache,
      color: 'error',
      errorMessage: text.deleteError,
      action: async () => {
        await removeImmediately(item)
      },
    })
  }

  async function removeImmediately(item: TranslationCacheItem) {
    setBusyId(item.id)
    setNotice('')
    setError('')
    try {
      await api.deleteTranslationCache(item.id)
      setNotice(text.deletedNotice)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.deleteError))
    } finally {
      setBusyId('')
    }
  }

  function cleanStale() {
    openConfirmDialog({
      title: commonText.destructiveAction,
      message: text.cleanConfirm,
      confirmLabel: text.cleanButton,
      color: 'warning',
      errorMessage: text.cleanError,
      action: async () => {
        await cleanStaleImmediately()
      },
    })
  }

  async function cleanStaleImmediately() {
    setCleaning(true)
    setNotice('')
    setError('')
    try {
      const result = await api.deleteStaleTranslationCaches()
      setNotice(text.cleanNotice(result.deleted))
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.cleanError))
    } finally {
      setCleaning(false)
    }
  }

  function backfillMissing() {
    openConfirmDialog({
      title: text.backfillButton,
      message: text.backfillConfirm,
      confirmLabel: text.backfillButton,
      color: 'primary',
      errorMessage: text.backfillError,
      action: async () => {
        await backfillMissingImmediately()
      },
    })
  }

  async function backfillMissingImmediately() {
    setBackfilling(true)
    setNotice('')
    setError('')
    try {
      const result = await api.backfillMissingTranslationCaches()
      setNotice(translationBackfillNotice(result, text.cache))
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.backfillError))
    } finally {
      setBackfilling(false)
    }
  }

  if (loading) return <LoadingState label={text.loading} />

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={backfillMissing}
            disabled={actionBusy}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {backfilling ? text.backfillBusy : text.backfillButton}
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Trash2 size={18} />}
            onClick={cleanStale}
            disabled={actionBusy}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {cleaning ? text.cleanBusy : text.cleanButton}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {text.currentPageCaches}
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              {summary.total}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {text.staleCaches}
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              {summary.stale}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {text.segments}
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              {summary.segments}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {text.bytes}
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              {formatCacheBytes(summary.bytes, text.locale)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', lg: 'row' }} gap={2} onSubmit={submit}>
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
            <TextField select label={text.targetLanguage} value={lang} onChange={(event) => patchFilter('lang', event.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">{text.allTargetLanguages}</MenuItem>
              {supportedLanguages.map((language) => (
                <MenuItem key={language.code} value={language.code}>
                  {languageOptionLabel(language)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={text.sourceLanguage}
              value={source}
              onChange={(event) => patchFilter('source', event.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">{text.allSourceLanguages}</MenuItem>
              {supportedLanguages.map((language) => (
                <MenuItem key={language.code} value={language.code}>
                  {languageOptionLabel(language)}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="outlined" startIcon={<Search size={18} />}>
              {text.search}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {items.length === 0 ? (
        <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{text.tablePost}</TableCell>
                  <TableCell>{text.tableLanguage}</TableCell>
                  <TableCell>{text.tableStatus}</TableCell>
                  <TableCell>{text.tableSegments}</TableCell>
                  <TableCell>{text.tableUpdated}</TableCell>
                  <TableCell align="right">{text.tableActions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const status = translationCacheStatus(item, text.cache)
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack gap={0.75}>
                          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap alignItems="center">
                            <Typography fontWeight={800}>{item.postTitle}</Typography>
                            <PostStatusChip status={item.postStatus} labels={text.statusLabels} />
                          </Stack>
                          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap alignItems="center">
                            <Chip size="small" icon={<Languages size={14} />} label={item.postSlug} variant="outlined" />
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {item.sourceHash.slice(0, 12)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack gap={0.5}>
                          <Typography variant="body2">{languageLabel(item.languageCode)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {text.sourcePrefix} {languageLabel(item.sourceLanguage)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack gap={0.5} alignItems="flex-start">
                          <Chip size="small" color={status.color} label={status.label} />
                          {item.jobStatus === 'failed' && item.jobError && (
                            <Typography variant="caption" color="error" sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}>
                              {item.jobError}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {item.hasCache === false ? (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="body2">{text.segmentCount(item.segmentCount)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatCacheBytes(item.contentBytes, text.locale)}
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(item.updatedAt, adminLanguage)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {text.createdAt(formatDate(item.createdAt, adminLanguage))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" justifyContent="flex-end" gap={1}>
                          <Button size="small" component={Link} to={`/posts/${item.postSlug}`} target="_blank">
                            {text.view}
                          </Button>
                          <Tooltip title={text.deleteCache}>
                            <span>
                              <IconButton color="error" onClick={() => remove(item)} disabled={actionBusy} aria-label={text.deleteCache}>
                                <Trash2 size={18} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                {text.paginationSummary(total, visiblePage, pages, summary.languages)}
              </Typography>
              <Pagination count={pages} page={visiblePage} color="primary" onChange={(_, value) => changePage(value)} siblingCount={1} boundaryCount={1} />
            </Stack>
          </CardContent>
        </Card>
      )}
      <AdminConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? commonText.destructiveAction}
        message={confirmDialog?.message ?? ''}
        cancelLabel={commonText.cancel}
        confirmLabel={confirmDialog?.confirmLabel ?? commonText.confirm}
        color={confirmDialog?.color ?? 'warning'}
        busy={actionBusy}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => void runConfirmDialogAction()}
      />
    </Stack>
  )
}
