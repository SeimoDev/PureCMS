import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Archive, ExternalLink, Eye, FileText, History, Plus, RotateCcw, Save, Search, Send, Trash2, X } from 'lucide-react'
import { createRef, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { countSelectedInPage, togglePageSelection, toggleSelection } from '../bulkSelection'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import MarkdownToolbar from '../components/MarkdownToolbar'
import { commonUIText } from '../commonUII18n'
import {
  pageDraftKey,
  parsePageDraft,
  serializePageDraft,
  shouldStorePageDraft,
  type PageDraftSnapshot,
} from '../editorDraft'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { pageInputWithStatus, pageToInput } from '../pages'
import { pagesManagerUIText, type PagesManagerUIText } from '../pagesManagerI18n'
import { clampPage, pageCount } from '../pagination'
import { postEditorUIText } from '../postEditorI18n'
import type { Page, PageInput, PageRevision } from '../types'

const pageManagerPageSize = 10

const emptyPage: PageInput = {
  title: '',
  slug: '',
  content: '',
  status: 'draft',
  showInNav: false,
  navLabel: '',
  sortOrder: 0,
  seoTitle: '',
  seoDescription: '',
}

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  color: 'warning' | 'error'
  errorMessage: string
  action: () => Promise<void>
}

function formatDraftSavedAt(value: string, text: PagesManagerUIText) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return text.justNow
  return date.toLocaleString(text.locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function pageStatusLabel(status: Page['status'] | string, text: PagesManagerUIText) {
  if (status === 'published' || status === 'draft' || status === 'archived') return text.statusLabels[status]
  return text.statusLabels.unknown
}

function pageStatusColor(status: Page['status']) {
  if (status === 'published') return 'success' as const
  if (status === 'draft') return 'warning' as const
  return 'default' as const
}

function statusOptions(text: PagesManagerUIText) {
  return [
    { value: '', label: text.statusAll },
    { value: 'published', label: text.statusLabels.published },
    { value: 'draft', label: text.statusLabels.draft },
    { value: 'archived', label: text.statusLabels.archived },
  ]
}

function navOptions(text: PagesManagerUIText) {
  return [
    { value: '', label: text.navAll },
    { value: 'shown', label: text.navShown },
    { value: 'hidden', label: text.navHidden },
  ]
}

export default function PagesManagerPage() {
  const { adminLanguage, isAdmin } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => pagesManagerUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const markdownToolbarText = useMemo(() => postEditorUIText(adminLanguage).toolbar, [adminLanguage])
  const pageStatusOptions = useMemo(() => statusOptions(text), [text])
  const pageNavOptions = useMemo(() => navOptions(text), [text])
  const [pages, setPages] = useState<Page[]>([])
  const [basePages, setBasePages] = useState<Record<string, PageInput>>({})
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(pageManagerPageSize)
  const [draft, setDraft] = useState<PageInput>(emptyPage)
  const [newPageDraftPrompt, setNewPageDraftPrompt] = useState<PageDraftSnapshot | null>(null)
  const [newPageDraftSavedAt, setNewPageDraftSavedAt] = useState('')
  const [pageDraftPrompts, setPageDraftPrompts] = useState<Record<string, PageDraftSnapshot>>({})
  const [pageDraftSavedAt, setPageDraftSavedAt] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [revisionPage, setRevisionPage] = useState<Page | null>(null)
  const [revisions, setRevisions] = useState<PageRevision[]>([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const deleted = searchParams.get('deleted') === '1'
  const query = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const nav = searchParams.get('nav') ?? ''
  const [keyword, setKeyword] = useState(query)
  const newPageContentRef = useRef<HTMLTextAreaElement | null>(null)
  const pageContentRefs = useRef<Record<string, RefObject<HTMLTextAreaElement | null>>>({})
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pagesCount = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pagesCount)
  const pageIds = pages.map((page) => page.id)
  const selectedInPage = countSelectedInPage(selectedIds, pageIds)
  const allCurrentPageSelected = pages.length > 0 && selectedInPage === pageIds.length
  const someCurrentPageSelected = selectedInPage > 0 && !allCurrentPageSelected
  const actionBusy = saving || bulkBusy || confirmBusy

  function getPageContentRef(id: string) {
    pageContentRefs.current[id] ??= createRef<HTMLTextAreaElement>()
    return pageContentRefs.current[id]
  }

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    setNotice('')
    api
      .adminPagesPage({ deleted: deleted ? 1 : undefined, q: query, status, nav, limit: pageManagerPageSize, page: currentPage })
      .then((value) => {
        const baseInputs = Object.fromEntries(value.items.map((page) => [page.id, pageToInput(page)]))
        const prompts = Object.fromEntries(
          value.items
            .map((page) => {
              const base = baseInputs[page.id]
              const savedDraft = parsePageDraft(localStorage.getItem(pageDraftKey(page.id)))
              return savedDraft && shouldStorePageDraft(savedDraft.form, base) ? [page.id, savedDraft] : null
            })
            .filter((item): item is [string, PageDraftSnapshot] => Boolean(item)),
        )
        const savedNewPageDraft = parsePageDraft(localStorage.getItem(pageDraftKey(null)))
        setPages(value.items)
        setBasePages(baseInputs)
        setPageDraftPrompts(prompts)
        setPageDraftSavedAt({})
        setNewPageDraftPrompt(
          savedNewPageDraft && shouldStorePageDraft(savedNewPageDraft.form, emptyPage) ? savedNewPageDraft : null,
        )
        setNewPageDraftSavedAt('')
        setTotal(value.total)
        setPageLimit(value.limit)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }, [currentPage, deleted, nav, query, status, text.loadError])

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedIds([])
  }, [deleted, nav, query, status])

  useEffect(() => {
    if (loading || deleted || newPageDraftPrompt) return
    const key = pageDraftKey(null)
    if (!shouldStorePageDraft(draft, emptyPage)) {
      localStorage.removeItem(key)
      setNewPageDraftSavedAt('')
      return
    }
    const timeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString()
      localStorage.setItem(key, serializePageDraft(draft, savedAt))
      setNewPageDraftSavedAt(savedAt)
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [deleted, draft, loading, newPageDraftPrompt])

  useEffect(() => {
    if (loading || deleted) return
    const timeout = window.setTimeout(() => {
      setPageDraftSavedAt((current) => {
        const next = { ...current }
        let changed = false
        pages.forEach((page) => {
          const base = basePages[page.id]
          if (!base || pageDraftPrompts[page.id]) return
          const key = pageDraftKey(page.id)
          if (shouldStorePageDraft(pageToInput(page), base)) {
            const savedAt = new Date().toISOString()
            localStorage.setItem(key, serializePageDraft(pageToInput(page), savedAt))
            next[page.id] = savedAt
            changed = true
          } else {
            localStorage.removeItem(key)
            if (next[page.id]) {
              delete next[page.id]
              changed = true
            }
          }
        })
        return changed ? next : current
      })
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [basePages, deleted, loading, pageDraftPrompts, pages])

  useEffect(() => {
    const hasNewDraft = !deleted && shouldStorePageDraft(draft, emptyPage)
    const hasEditedPageDraft =
      !deleted && pages.some((page) => basePages[page.id] && shouldStorePageDraft(pageToInput(page), basePages[page.id]))
    if (!hasNewDraft && !hasEditedPageDraft) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [basePages, deleted, draft, pages])

  function submitFilters(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    setSearchParams(params)
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  function changePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    setSearchParams(params)
  }

  function clearNewPageDraft() {
    localStorage.removeItem(pageDraftKey(null))
    setNewPageDraftPrompt(null)
    setNewPageDraftSavedAt('')
  }

  function restoreNewPageDraft() {
    if (!newPageDraftPrompt) return
    const savedAt = new Date().toISOString()
    localStorage.setItem(pageDraftKey(null), serializePageDraft(newPageDraftPrompt.form, savedAt))
    setDraft(newPageDraftPrompt.form)
    setNewPageDraftPrompt(null)
    setNewPageDraftSavedAt(savedAt)
    setNotice(text.newDraftRestored)
    setError('')
  }

  function discardNewPageDraft() {
    clearNewPageDraft()
    setNotice(text.newDraftDiscarded)
    setError('')
  }

  function clearPageDraft(pageId: string) {
    localStorage.removeItem(pageDraftKey(pageId))
    setPageDraftPrompts((items) => {
      const next = { ...items }
      delete next[pageId]
      return next
    })
    setPageDraftSavedAt((items) => {
      const next = { ...items }
      delete next[pageId]
      return next
    })
  }

  function restorePageDraft(pageId: string) {
    const savedDraft = pageDraftPrompts[pageId]
    if (!savedDraft) return
    const savedAt = new Date().toISOString()
    localStorage.setItem(pageDraftKey(pageId), serializePageDraft(savedDraft.form, savedAt))
    setPages((items) => items.map((item) => (item.id === pageId ? { ...item, ...savedDraft.form } : item)))
    setPageDraftPrompts((items) => {
      const next = { ...items }
      delete next[pageId]
      return next
    })
    setPageDraftSavedAt((items) => ({ ...items, [pageId]: savedAt }))
    setNotice(text.pageDraftRestored)
    setError('')
  }

  function discardPageDraft(pageId: string) {
    clearPageDraft(pageId)
    setNotice(text.pageDraftDiscarded)
    setError('')
  }

  function togglePageRows(checked: boolean) {
    setSelectedIds((value) => togglePageSelection(value, pageIds, checked))
  }

  function togglePageItem(id: string) {
    setSelectedIds((value) => toggleSelection(value, id))
  }

  function openConfirmDialog(next: ConfirmDialogState) {
    setConfirmDialog(next)
  }

  async function runConfirmDialogAction() {
    if (!confirmDialog || confirmBusy) return
    const action = confirmDialog.action
    const errorMessage = confirmDialog.errorMessage
    setConfirmBusy(true)
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

  async function runBulkPageAction(action: (ids: string[]) => Promise<unknown>, clearDrafts = false, successMessage = '') {
    const ids = [...selectedIds]
    if (ids.length === 0 || bulkBusy) return
    setBulkBusy(true)
    setNotice('')
    setError('')
    try {
      await action(ids)
      if (clearDrafts) {
        ids.forEach(clearPageDraft)
      }
      setSelectedIds([])
      if (successMessage) {
        setNotice(successMessage)
      }
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.bulkError))
    } finally {
      setBulkBusy(false)
    }
  }

  function bulkDeletePages() {
    const count = selectedIds.length
    openConfirmDialog({
      message: text.confirmBulkTrash(count),
      confirmLabel: text.moveToTrash,
      color: 'warning',
      errorMessage: text.bulkError,
      action: async () => {
        await runBulkPageAction(
          (ids) => Promise.all(ids.map((id) => api.deletePage(id))),
          true,
          text.bulkTrashed(count),
        )
      },
    })
  }

  async function bulkRestorePages() {
    await runBulkPageAction(
      (ids) => Promise.all(ids.map((id) => api.restorePage(id))),
      false,
      text.bulkRestored(selectedIds.length),
    )
  }

  function bulkPermanentlyDeletePages() {
    if (!isAdmin) return
    const count = selectedIds.length
    openConfirmDialog({
      message: text.confirmBulkPermanentDelete(count),
      confirmLabel: text.bulkPermanentDelete,
      color: 'error',
      errorMessage: text.bulkError,
      action: async () => {
        await runBulkPageAction(
          (ids) => Promise.all(ids.map((id) => api.permanentlyDeletePage(id))),
          true,
          text.bulkDeleted(count),
        )
      },
    })
  }

  async function bulkUpdatePageStatus(nextStatus: Page['status']) {
    const label = text.statusActionLabels[nextStatus]
    await runBulkPageAction(
      (ids) =>
        Promise.all(
          ids.map((id) => {
            const page = pages.find((item) => item.id === id)
            if (page) {
              return api.updatePage(id, pageInputWithStatus(page, nextStatus))
            }
            return api.adminPage(id).then((loadedPage) => api.updatePage(id, pageInputWithStatus(loadedPage, nextStatus)))
          }),
        ),
      true,
      text.bulkStatusNotice(label, selectedIds.length),
    )
  }

  async function createPage(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createPage(draft)
      clearNewPageDraft()
      setDraft(emptyPage)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.createError))
    } finally {
      setSaving(false)
    }
  }

  async function updatePage(page: Page) {
    setSaving(true)
    setError('')
    try {
      await api.updatePage(page.id, pageToInput(page))
      clearPageDraft(page.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.saveError))
    } finally {
      setSaving(false)
    }
  }

  function deletePage(page: Page) {
    openConfirmDialog({
      message: text.confirmTrashPage(page.title),
      confirmLabel: text.moveToTrash,
      color: 'warning',
      errorMessage: text.deleteError,
      action: async () => {
        setSaving(true)
        try {
          await api.deletePage(page.id)
          clearPageDraft(page.id)
          setSelectedIds((value) => value.filter((selectedId) => selectedId !== page.id))
          load()
        } finally {
          setSaving(false)
        }
      },
    })
  }

  async function restorePage(page: Page) {
    setSaving(true)
    setError('')
    try {
      await api.restorePage(page.id)
      setSelectedIds((value) => value.filter((selectedId) => selectedId !== page.id))
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.restoreError))
    } finally {
      setSaving(false)
    }
  }

  function permanentlyDeletePage(page: Page) {
    if (!isAdmin) return
    openConfirmDialog({
      message: text.confirmPermanentDeletePage(page.title),
      confirmLabel: text.bulkPermanentDelete,
      color: 'error',
      errorMessage: text.permanentDeleteError,
      action: async () => {
        setSaving(true)
        try {
          await api.permanentlyDeletePage(page.id)
          clearPageDraft(page.id)
          setSelectedIds((value) => value.filter((selectedId) => selectedId !== page.id))
          load()
        } finally {
          setSaving(false)
        }
      },
    })
  }

  async function openRevisions(page: Page) {
    setRevisionPage(page)
    setRevisions([])
    setLoadingRevisions(true)
    setError('')
    try {
      setRevisions(await api.pageRevisions(page.id))
    } catch (err) {
      setError(apiErrorMessage(err, text.revisionsLoadError))
    } finally {
      setLoadingRevisions(false)
    }
  }

  function restoreRevision(revision: PageRevision) {
    if (!revisionPage) return
    const pageId = revisionPage.id
    openConfirmDialog({
      message: text.confirmRestoreRevision(revision.versionNumber),
      confirmLabel: text.restoreRevision,
      color: 'warning',
      errorMessage: text.revisionRestoreError,
      action: async () => {
        setSaving(true)
        try {
          await api.restorePageRevision(pageId, revision.id)
          clearPageDraft(pageId)
          setRevisions(await api.pageRevisions(pageId))
          load()
        } finally {
          setSaving(false)
        }
      },
    })
  }

  function patchPage(id: string, value: Partial<Page>) {
    setPages((items) => items.map((item) => (item.id === id ? { ...item, ...value } : item)))
  }

  if (loading) return <LoadingState label={text.loadingLabel} />

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Chip label={text.totalChip(total)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <Card>
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={2} onSubmit={submitFilters}>
            <TextField
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={text.filterPlaceholder}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label={text.scopeLabel}
              value={deleted ? 'trash' : 'active'}
              onChange={(event) => setParam('deleted', event.target.value === 'trash' ? '1' : '')}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="active">{text.activePages}</MenuItem>
              <MenuItem value="trash">{text.trash}</MenuItem>
            </TextField>
            <TextField
              select
              label={text.statusLabel}
              value={status}
              onChange={(event) => setParam('status', event.target.value)}
              sx={{ minWidth: 150 }}
            >
              {pageStatusOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={text.navLabel}
              value={nav}
              onChange={(event) => setParam('nav', event.target.value)}
              sx={{ minWidth: 160 }}
            >
              {pageNavOptions.map((option) => (
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

      {!deleted && (
        <Card>
          <CardContent>
            <Stack component="form" gap={2} onSubmit={createPage}>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                <Stack direction="row" gap={1} alignItems="center">
                  <FileText size={20} />
                  <Typography variant="h6">{text.newPage}</Typography>
                </Stack>
                {newPageDraftSavedAt && !newPageDraftPrompt && (
                  <Typography variant="caption" color="text.secondary">
                    {text.draftSaved(formatDraftSavedAt(newPageDraftSavedAt, text))}
                  </Typography>
                )}
              </Stack>
              {newPageDraftPrompt && (
                <Alert
                  severity="warning"
                  action={
                    <Stack direction="row" gap={1}>
                      <Button type="button" color="inherit" size="small" onClick={restoreNewPageDraft}>
                        {text.restore}
                      </Button>
                      <Button type="button" color="inherit" size="small" onClick={discardNewPageDraft}>
                        {text.clear}
                      </Button>
                    </Stack>
                  }
                >
                  {text.newDraftFound(formatDraftSavedAt(newPageDraftPrompt.savedAt, text))}
                </Alert>
              )}
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 160px' } }}>
                <TextField required label={text.titleLabel} value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} />
                <TextField label={text.slugLabel} value={draft.slug} onChange={(event) => setDraft((value) => ({ ...value, slug: event.target.value }))} placeholder={text.slugPlaceholder} />
                <TextField
                  label={text.sortOrder}
                  type="number"
                  value={draft.sortOrder}
                  onChange={(event) => setDraft((value) => ({ ...value, sortOrder: Number(event.target.value) }))}
                />
              </Box>
              <MarkdownToolbar
                value={draft.content}
                onChange={(content) => setDraft((value) => ({ ...value, content }))}
                textareaRef={newPageContentRef}
                compact
                text={markdownToolbarText}
              />
              <TextField
                required
                label={text.contentLabel}
                value={draft.content}
                onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))}
                multiline
                minRows={5}
                inputRef={newPageContentRef}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  select
                  label={text.statusLabel}
                  value={draft.status}
                  onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as Page['status'] }))}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="draft">{text.statusLabels.draft}</MenuItem>
                  <MenuItem value="published">{text.statusLabels.published}</MenuItem>
                  <MenuItem value="archived">{text.statusLabels.archived}</MenuItem>
                </TextField>
                <TextField label={text.navTextLabel} value={draft.navLabel} onChange={(event) => setDraft((value) => ({ ...value, navLabel: event.target.value }))} />
                <FormControlLabel
                  control={<Switch checked={draft.showInNav} onChange={(event) => setDraft((value) => ({ ...value, showInNav: event.target.checked }))} />}
                  label={text.showInNav}
                />
              </Stack>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <TextField label={text.seoTitle} value={draft.seoTitle} onChange={(event) => setDraft((value) => ({ ...value, seoTitle: event.target.value }))} />
                <TextField label={text.seoDescription} value={draft.seoDescription} onChange={(event) => setDraft((value) => ({ ...value, seoDescription: event.target.value }))} />
              </Box>
              <Button type="submit" variant="contained" startIcon={<Plus size={18} />} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
                {text.createPage}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {(selectedIds.length > 0 || pages.length > 0) && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" gap={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Checkbox
                  checked={allCurrentPageSelected}
                  indeterminate={someCurrentPageSelected}
                  onChange={(event) => togglePageRows(event.target.checked)}
                  disabled={pages.length === 0 || actionBusy}
                  inputProps={{ 'aria-label': text.selectPageAria }}
                />
                <Box>
                  <Typography fontWeight={900}>{text.bulkTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.bulkSelected(selectedIds.length, selectedInPage)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {deleted ? (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={bulkRestorePages}
                      disabled={selectedIds.length === 0 || actionBusy}
                      startIcon={<RotateCcw size={16} />}
                    >
                      {text.bulkRestore}
                    </Button>
                    {isAdmin && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={bulkPermanentlyDeletePages}
                        disabled={selectedIds.length === 0 || actionBusy}
                        startIcon={<Trash2 size={16} />}
                      >
                        {text.bulkPermanentDelete}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdatePageStatus('published')}
                      disabled={selectedIds.length === 0 || actionBusy}
                      startIcon={<Send size={16} />}
                    >
                      {text.bulkPublish}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdatePageStatus('draft')}
                      disabled={selectedIds.length === 0 || actionBusy}
                      startIcon={<FileText size={16} />}
                    >
                      {text.toDraft}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdatePageStatus('archived')}
                      disabled={selectedIds.length === 0 || actionBusy}
                      startIcon={<Archive size={16} />}
                    >
                      {text.bulkArchive}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={bulkDeletePages}
                      disabled={selectedIds.length === 0 || actionBusy}
                      startIcon={<Trash2 size={16} />}
                    >
                      {text.moveToTrash}
                    </Button>
                  </>
                )}
                <Button
                  size="small"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0 || actionBusy}
                  startIcon={<X size={16} />}
                >
                  {text.clear}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {pages.length === 0 ? (
        <EmptyState title={query || status || nav ? text.noMatchedPages : deleted ? text.emptyTrash : text.emptyPages} />
      ) : (
        <Stack gap={2}>
          {pages.map((page) => (
            <Card
              key={page.id}
              sx={{
                borderColor: selectedIds.includes(page.id) ? 'primary.main' : undefined,
                boxShadow: selectedIds.includes(page.id) ? '0 0 0 1px rgba(37, 107, 87, 0.18)' : undefined,
              }}
            >
              <CardContent>
                <Stack gap={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between">
                    <Stack direction="row" gap={1} alignItems="flex-start" minWidth={0}>
                      <Checkbox
                        checked={selectedIds.includes(page.id)}
                        onChange={() => togglePageItem(page.id)}
                        disabled={actionBusy}
                        inputProps={{ 'aria-label': text.selectItemAria(page.title) }}
                        sx={{ mt: -0.75 }}
                      />
                      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={pageStatusLabel(page.status, text)} color={pageStatusColor(page.status)} />
                        {page.showInNav && <Chip size="small" label={text.navigationChip} color="primary" variant="outlined" />}
                        {page.deletedAt && <Chip size="small" label={text.deletedAt(page.deletedAt.slice(0, 10))} color="error" variant="outlined" />}
                        {pageDraftSavedAt[page.id] && !pageDraftPrompts[page.id] && (
                          <Chip size="small" label={text.draftSavedChip(formatDraftSavedAt(pageDraftSavedAt[page.id], text))} variant="outlined" />
                        )}
                      </Stack>
                    </Stack>
                    <Stack direction="row" gap={0.5}>
                      {deleted ? (
                        <>
                          <IconButton onClick={() => restorePage(page)} disabled={actionBusy} aria-label={text.restorePageAria}>
                            <RotateCcw size={18} />
                          </IconButton>
                          {isAdmin && (
                            <IconButton color="error" onClick={() => permanentlyDeletePage(page)} disabled={actionBusy} aria-label={text.permanentDeleteAria}>
                              <Trash2 size={18} />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        <>
                          <IconButton component={Link} to={`/admin/preview/pages/${page.id}`} aria-label={text.previewAria}>
                            <Eye size={18} />
                          </IconButton>
                          <IconButton onClick={() => openRevisions(page)} aria-label={text.revisionsAria}>
                            <History size={18} />
                          </IconButton>
                          <IconButton component={Link} to={`/pages/${page.slug}`} target="_blank" aria-label={text.openPageAria} disabled={page.status !== 'published'}>
                            <ExternalLink size={18} />
                          </IconButton>
                          <IconButton onClick={() => updatePage(page)} disabled={actionBusy} aria-label={text.savePageAria}>
                            <Save size={18} />
                          </IconButton>
                          <IconButton color="error" onClick={() => deletePage(page)} disabled={actionBusy} aria-label={text.trashAria}>
                            <Trash2 size={18} />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                  </Stack>
                  {pageDraftPrompts[page.id] && (
                    <Alert
                      severity="warning"
                      action={
                        <Stack direction="row" gap={1}>
                          <Button type="button" color="inherit" size="small" onClick={() => restorePageDraft(page.id)}>
                            {text.restore}
                          </Button>
                          <Button type="button" color="inherit" size="small" onClick={() => discardPageDraft(page.id)}>
                            {text.clear}
                          </Button>
                        </Stack>
                      }
                    >
                      {text.pageDraftFound(formatDraftSavedAt(pageDraftPrompts[page.id].savedAt, text))}
                    </Alert>
                  )}
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 140px' } }}>
                    <TextField disabled={deleted} size="small" label={text.titleLabel} value={page.title} onChange={(event) => patchPage(page.id, { title: event.target.value })} />
                    <TextField disabled={deleted} size="small" label={text.slugLabel} value={page.slug} onChange={(event) => patchPage(page.id, { slug: event.target.value })} />
                    <TextField disabled={deleted} size="small" label={text.sortOrder} type="number" value={page.sortOrder} onChange={(event) => patchPage(page.id, { sortOrder: Number(event.target.value) })} />
                  </Box>
                  <MarkdownToolbar
                    value={page.content}
                    onChange={(content) => patchPage(page.id, { content })}
                    textareaRef={getPageContentRef(page.id)}
                    compact
                    text={markdownToolbarText}
                  />
                  <TextField
                    disabled={deleted}
                    size="small"
                    label={text.contentLabel}
                    value={page.content}
                    onChange={(event) => patchPage(page.id, { content: event.target.value })}
                    multiline
                    minRows={5}
                    inputRef={getPageContentRef(page.id)}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField
                      disabled={deleted}
                      select
                      size="small"
                      label={text.statusLabel}
                      value={page.status}
                      onChange={(event) => patchPage(page.id, { status: event.target.value as Page['status'] })}
                      sx={{ minWidth: 160 }}
                    >
                      <MenuItem value="draft">{text.statusLabels.draft}</MenuItem>
                      <MenuItem value="published">{text.statusLabels.published}</MenuItem>
                      <MenuItem value="archived">{text.statusLabels.archived}</MenuItem>
                    </TextField>
                    <TextField disabled={deleted} size="small" label={text.navTextLabel} value={page.navLabel} onChange={(event) => patchPage(page.id, { navLabel: event.target.value })} />
                    <FormControlLabel
                      control={<Switch disabled={deleted} checked={page.showInNav} onChange={(event) => patchPage(page.id, { showInNav: event.target.checked })} />}
                      label={text.showInNav}
                    />
                  </Stack>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                    <TextField disabled={deleted} size="small" label={text.seoTitle} value={page.seoTitle} onChange={(event) => patchPage(page.id, { seoTitle: event.target.value })} />
                    <TextField disabled={deleted} size="small" label={text.seoDescription} value={page.seoDescription} onChange={(event) => patchPage(page.id, { seoDescription: event.target.value })} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  {text.paginationSummary(total, visiblePage, pagesCount)}
                </Typography>
                <Pagination
                  count={pagesCount}
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

      <Dialog open={Boolean(confirmDialog)} onClose={() => (!actionBusy ? setConfirmDialog(null) : undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>{commonText.destructiveAction}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)} disabled={actionBusy}>
            {commonText.cancel}
          </Button>
          <Button variant="contained" color={confirmDialog?.color ?? 'warning'} onClick={() => void runConfirmDialogAction()} disabled={actionBusy}>
            {confirmDialog?.confirmLabel ?? commonText.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(revisionPage)} onClose={() => setRevisionPage(null)} maxWidth="md" fullWidth>
        <DialogTitle>{text.revisionsTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack gap={2}>
            {revisionPage && (
              <Box>
                <Typography variant="h6">{revisionPage.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {text.revisionsSubtitle}
                </Typography>
              </Box>
            )}
            {loadingRevisions ? (
              <LoadingState label={text.revisionsLoading} />
            ) : revisions.length === 0 ? (
              <Typography color="text.secondary">{text.revisionsEmpty}</Typography>
            ) : (
              <Stack divider={<Divider flexItem />}>
                {revisions.map((revision) => (
                  <Stack key={revision.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ py: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={text.revisionVersion(revision.versionNumber)} color="primary" />
                        <Typography fontWeight={900}>{revision.title}</Typography>
                        <Chip size="small" label={pageStatusLabel(revision.status, text)} variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {revision.createdAt.slice(0, 10)} - /pages/{revision.slug}
                      </Typography>
                    </Box>
                    <Button size="small" startIcon={<RotateCcw size={16} />} onClick={() => restoreRevision(revision)} disabled={saving}>
                      {text.restoreRevision}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevisionPage(null)}>{text.close}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
