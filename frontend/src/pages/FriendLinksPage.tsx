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
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { ExternalLink, Eye, EyeOff, Link2, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { countSelectedInPage, togglePageSelection, toggleSelection } from '../bulkSelection'
import AdminConfirmDialog from '../components/AdminConfirmDialog'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import { commonUIText } from '../commonUII18n'
import { countFriendLinksByStatus, filterFriendLinks, type FriendLinkStatusFilter } from '../friendLinkFilters'
import { friendLinksPageUIText, type FriendLinksPageUIText } from '../friendLinksPageI18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import type { FriendLink, FriendLinkInput } from '../types'

const emptyLink: FriendLinkInput = {
  name: '',
  url: '',
  description: '',
  logoUrl: '',
  status: 'active',
  sortOrder: 0,
}

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  action: () => Promise<void>
}

function toInput(link: FriendLink): FriendLinkInput {
  return {
    name: link.name,
    url: link.url,
    description: link.description,
    logoUrl: link.logoUrl,
    status: link.status,
    sortOrder: link.sortOrder,
  }
}

function failureSummary(failures: { name: string; message: string }[], text: FriendLinksPageUIText) {
  return failures
    .slice(0, 3)
    .map((failure) => text.failureDetail(failure.name, failure.message))
    .join(text.failureSeparator)
}

export default function FriendLinksPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => friendLinksPageUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const [links, setLinks] = useState<FriendLink[]>([])
  const [draft, setDraft] = useState<FriendLinkInput>(emptyLink)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FriendLinkStatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const filteredLinks = useMemo(() => filterFriendLinks(links, query, statusFilter), [links, query, statusFilter])
  const stats = useMemo(() => countFriendLinksByStatus(links), [links])
  const visibleIds = filteredLinks.map((link) => link.id)
  const selectedInView = countSelectedInPage(selectedIds, visibleIds)
  const allVisibleSelected = filteredLinks.length > 0 && selectedInView === visibleIds.length
  const someVisibleSelected = selectedInView > 0 && !allVisibleSelected
  const actionBusy = saving || bulkBusy || confirmBusy

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const value = await api.adminFriendLinks()
      setLinks(value)
    } catch (err) {
      setError(apiErrorMessage(err, text.loadError))
    } finally {
      setLoading(false)
    }
  }, [text.loadError])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSelectedIds([])
  }, [query, statusFilter])

  async function createLink(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    setError('')
    try {
      await api.createFriendLink(draft)
      setDraft(emptyLink)
      setNotice(text.createdNotice)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.createError))
    } finally {
      setSaving(false)
    }
  }

  async function updateLink(link: FriendLink) {
    setSaving(true)
    setNotice('')
    setError('')
    try {
      await api.updateFriendLink(link.id, toInput(link))
      setNotice(text.savedNotice)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.saveError))
    } finally {
      setSaving(false)
    }
  }

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
      setError(apiErrorMessage(err, text.deleteError))
    } finally {
      setConfirmBusy(false)
    }
  }

  function deleteLink(link: FriendLink) {
    openConfirmDialog({
      message: text.deleteConfirm(link.name),
      confirmLabel: text.deleteLink,
      action: async () => {
        setSaving(true)
        try {
          await api.deleteFriendLink(link.id)
          setSelectedIds((value) => value.filter((selectedId) => selectedId !== link.id))
          setNotice(text.deletedNotice)
          await load()
        } finally {
          setSaving(false)
        }
      },
    })
  }

  function patchLink(id: string, value: Partial<FriendLink>) {
    setLinks((items) => items.map((item) => (item.id === id ? { ...item, ...value } : item)))
  }

  function toggleVisibleLinks(checked: boolean) {
    setSelectedIds((value) => togglePageSelection(value, visibleIds, checked))
  }

  function toggleLink(id: string) {
    setSelectedIds((value) => toggleSelection(value, id))
  }

  async function bulkUpdateStatus(status: FriendLink['status']) {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkBusy(true)
    setNotice('')
    setError('')
    const failures: { id: string; name: string; message: string }[] = []
    let updated = 0

    try {
      for (const id of ids) {
        const link = links.find((item) => item.id === id)
        if (!link) continue
        try {
          await api.updateFriendLink(id, toInput({ ...link, status }))
          updated += 1
        } catch (err) {
          failures.push({ id, name: link.name, message: apiErrorMessage(err, text.updateFailure )})
        }
      }

      setSelectedIds(failures.map((failure) => failure.id))
      await load()
      if (failures.length > 0) {
        setError(text.bulkUpdateFailure(updated, failures.length, failureSummary(failures, text), failures.length > 3 ? text.moreFailures : ''))
      } else {
        setNotice(text.bulkStatusNotice(updated, text.statusLabels[status]))
      }
    } finally {
      setBulkBusy(false)
    }
  }

  function bulkDeleteLinks() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    openConfirmDialog({
      message: text.bulkDeleteConfirm(ids.length),
      confirmLabel: text.bulkDelete,
      action: async () => {
        await bulkDeleteLinksImmediately(ids)
      },
    })
  }

  async function bulkDeleteLinksImmediately(ids: string[]) {
    setBulkBusy(true)
    setNotice('')
    setError('')
    const failures: { id: string; name: string; message: string }[] = []
    let deleted = 0

    try {
      for (const id of ids) {
        const link = links.find((item) => item.id === id)
        if (!link) continue
        try {
          await api.deleteFriendLink(id)
          deleted += 1
        } catch (err) {
          failures.push({ id, name: link.name, message: apiErrorMessage(err, text.deleteFailure )})
        }
      }

      setSelectedIds(failures.map((failure) => failure.id))
      await load()
      if (failures.length > 0) {
        setError(text.bulkDeleteFailure(deleted, failures.length, failureSummary(failures, text), failures.length > 3 ? text.moreFailures : ''))
      } else {
        setNotice(text.bulkDeleteNotice(deleted))
      }
    } finally {
      setBulkBusy(false)
    }
  }

  if (loading) return <LoadingState label={text.loading} />

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h4">{text.title}</Typography>
        <Typography color="text.secondary">{text.subtitle}</Typography>
      </Box>
      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack component="form" gap={2} onSubmit={createLink}>
            <Stack direction="row" gap={1} alignItems="center">
              <Link2 size={20} />
              <Typography variant="h6">{text.newTitle}</Typography>
            </Stack>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1.3fr' } }}>
              <TextField required label={text.name} value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} />
              <TextField required label={text.url} value={draft.url} onChange={(event) => setDraft((value) => ({ ...value, url: event.target.value }))} placeholder="example.com" />
              <TextField label="Logo URL" value={draft.logoUrl} onChange={(event) => setDraft((value) => ({ ...value, logoUrl: event.target.value }))} />
              <TextField
                label={text.sortOrder}
                type="number"
                value={draft.sortOrder}
                onChange={(event) => setDraft((value) => ({ ...value, sortOrder: Number(event.target.value) }))}
              />
            </Box>
            <TextField
              label={text.description}
              value={draft.description}
              onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
              multiline
              minRows={2}
            />
            <Button type="submit" variant="contained" startIcon={<Plus size={18} />} disabled={actionBusy} sx={{ alignSelf: 'flex-start' }}>
              {text.createLink}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack direction={{ xs: 'column', lg: 'row' }} gap={2} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.searchPlaceholder}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
                sx={{ minWidth: { lg: 360 }, flex: 1 }}
              />
              <ToggleButtonGroup
                exclusive
                size="small"
                value={statusFilter}
                onChange={(_, value: FriendLinkStatusFilter | null) => {
                  if (value) setStatusFilter(value)
                }}
              >
                <ToggleButton value="all">{text.all(stats.total)}</ToggleButton>
                <ToggleButton value="active">{text.activeFilter(stats.active)}</ToggleButton>
                <ToggleButton value="hidden">{text.hiddenFilter(stats.hidden)}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {(filteredLinks.length > 0 || selectedIds.length > 0) && (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  px: 1.5,
                  py: 1,
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
                  <Stack direction="row" gap={1} alignItems="center">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onChange={(event) => toggleVisibleLinks(event.target.checked)}
                      disabled={filteredLinks.length === 0 || actionBusy}
                    />
                    <Box>
                      <Typography fontWeight={900}>{text.bulkTitle}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {text.bulkSelected(selectedIds.length, filteredLinks.length)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                    <Button startIcon={<Eye size={18} />} onClick={() => void bulkUpdateStatus('active')} disabled={selectedIds.length === 0 || actionBusy}>
                      {text.setActive}
                    </Button>
                    <Button startIcon={<EyeOff size={18} />} onClick={() => void bulkUpdateStatus('hidden')} disabled={selectedIds.length === 0 || actionBusy}>
                      {text.setHidden}
                    </Button>
                    <Button color="error" startIcon={<Trash2 size={18} />} onClick={() => void bulkDeleteLinks()} disabled={selectedIds.length === 0 || actionBusy}>
                      {text.bulkDelete}
                    </Button>
                    <Button startIcon={<X size={18} />} onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0 || actionBusy}>
                      {text.clear}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {filteredLinks.length === 0 ? (
        <Stack gap={1}>
          <EmptyState title={links.length === 0 ? text.empty : text.emptyFiltered} />
          <Typography color="text.secondary">{links.length === 0 ? text.emptyDescription : text.emptyFilteredDescription}</Typography>
        </Stack>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}>
          {filteredLinks.map((link) => {
            const selected = selectedIds.includes(link.id)
            return (
              <Card
                key={link.id}
                sx={{
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  boxShadow: selected ? '0 0 0 1px rgba(37, 107, 87, 0.18)' : undefined,
                }}
              >
                <CardContent>
                  <Stack gap={2}>
                    <Stack direction="row" gap={1} justifyContent="space-between" alignItems="center">
                      <Stack direction="row" gap={1} alignItems="center">
                        <Checkbox checked={selected} onChange={() => toggleLink(link.id)} disabled={actionBusy} />
                        <Chip size="small" label={text.statusLabels[link.status]} color={link.status === 'active' ? 'success' : 'default'} />
                      </Stack>
                      <Stack direction="row" gap={0.5}>
                        <IconButton component="a" href={link.url} target="_blank" rel="noreferrer" aria-label={text.openLink}>
                          <ExternalLink size={18} />
                        </IconButton>
                        <IconButton onClick={() => void updateLink(link)} disabled={actionBusy} aria-label={text.saveLink}>
                          <Save size={18} />
                        </IconButton>
                        <IconButton color="error" onClick={() => void deleteLink(link)} disabled={actionBusy} aria-label={text.deleteLink}>
                          <Trash2 size={18} />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1.3fr' } }}>
                      <TextField size="small" label={text.name} value={link.name} onChange={(event) => patchLink(link.id, { name: event.target.value })} />
                      <TextField size="small" label={text.url} value={link.url} onChange={(event) => patchLink(link.id, { url: event.target.value })} />
                      <TextField size="small" label="Logo URL" value={link.logoUrl} onChange={(event) => patchLink(link.id, { logoUrl: event.target.value })} />
                      <Stack direction="row" gap={1}>
                        <TextField
                          fullWidth
                          select
                          size="small"
                          label={text.status}
                          value={link.status}
                          onChange={(event) => patchLink(link.id, { status: event.target.value as FriendLink['status'] })}
                        >
                          <MenuItem value="active">{text.statusLabels.active}</MenuItem>
                          <MenuItem value="hidden">{text.statusLabels.hidden}</MenuItem>
                        </TextField>
                        <TextField
                          sx={{ width: 112, flexShrink: 0 }}
                          size="small"
                          label={text.sortOrder}
                          type="number"
                          value={link.sortOrder}
                          onChange={(event) => patchLink(link.id, { sortOrder: Number(event.target.value) })}
                        />
                      </Stack>
                    </Box>
                    <TextField
                      size="small"
                      label={text.description}
                      value={link.description}
                      onChange={(event) => patchLink(link.id, { description: event.target.value })}
                      multiline
                      minRows={2}
                    />
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}
      <AdminConfirmDialog
        open={Boolean(confirmDialog)}
        title={commonText.destructiveAction}
        message={confirmDialog?.message ?? ''}
        cancelLabel={commonText.cancel}
        confirmLabel={confirmDialog?.confirmLabel ?? commonText.confirm}
        color="error"
        busy={actionBusy}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => void runConfirmDialogAction()}
      />
    </Stack>
  )
}
