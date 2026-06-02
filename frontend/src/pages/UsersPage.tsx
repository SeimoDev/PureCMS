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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { KeyRound, Plus, Save, Search, Trash2, UserCheck, UserX, X } from 'lucide-react'
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
import { clampPage, pageCount } from '../pagination'
import { isStrongPassword, passwordPolicyHelperText } from '../passwordPolicy'
import type { User, UserInput } from '../types'
import { selectableUserIds, selectedUsersForBulkAction } from '../users'
import { usersPageUIText } from '../usersPageI18n'

const userPageSize = 10

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  errorMessage: string
  action: () => Promise<void>
}

const emptyUser: UserInput = {
  username: '',
  displayName: '',
  password: '',
  role: 'editor',
  status: 'active',
}

export default function UsersPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => usersPageUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const passwordPolicyHelper = useMemo(() => passwordPolicyHelperText(adminLanguage), [adminLanguage])
  const roleOptions = useMemo(
    () => [
      { value: '', label: text.allRoles },
      { value: 'admin', label: text.roleLabels.admin },
      { value: 'editor', label: text.roleLabels.editor },
    ],
    [text.allRoles, text.roleLabels.admin, text.roleLabels.editor],
  )
  const statusOptions = useMemo(
    () => [
      { value: '', label: text.allStatuses },
      { value: 'active', label: text.statusLabels.active },
      { value: 'disabled', label: text.statusLabels.disabled },
    ],
    [text.allStatuses, text.statusLabels.active, text.statusLabels.disabled],
  )
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(userPageSize)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [draft, setDraft] = useState<UserInput>(emptyUser)
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const role = searchParams.get('role') ?? ''
  const status = searchParams.get('status') ?? ''
  const [keyword, setKeyword] = useState(query)
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const selectableIds = selectableUserIds(users, currentUser?.id)
  const selectedInPage = countSelectedInPage(selectedIds, selectableIds)
  const allCurrentPageSelected = selectableIds.length > 0 && selectedInPage === selectableIds.length
  const someCurrentPageSelected = selectedInPage > 0 && !allCurrentPageSelected
  const actionBusy = bulkBusy || confirmBusy

  function roleName(value: string) {
    if (value === 'admin') return text.roleLabels.admin
    if (value === 'editor') return text.roleLabels.editor
    return text.roleLabels.unknown
  }

  function statusName(value: string) {
    return value === 'disabled' ? text.statusLabels.disabled : text.statusLabels.active
  }

  function failureMore(count: number) {
    return count > 3 ? text.moreFailures : ''
  }

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([api.usersPage({ q: query, role, status, limit: userPageSize, page: currentPage }), api.me()])
      .then(([page, me]) => {
        setUsers(page.items)
        setTotal(page.total)
        setPageLimit(page.limit)
        setCurrentUser(me)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }, [currentPage, query, role, status, text.loadError])

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedIds([])
  }, [currentPage, query, role, status])

  useEffect(() => {
    if (currentUser) setSelectedIds((value) => value.filter((id) => id !== currentUser.id))
  }, [currentUser])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    setSearchParams(params)
  }

  function changeRole(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set('role', value)
    else params.delete('role')
    params.delete('page')
    setSearchParams(params)
  }

  function changeStatus(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set('status', value)
    else params.delete('status')
    params.delete('page')
    setSearchParams(params)
  }

  function changePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    setSearchParams(params)
  }

  async function createUser(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setError('')
    if (!isStrongPassword(draft.password ?? '')) {
      setError(passwordPolicyHelper)
      return
    }
    try {
      await api.createUser(draft)
      setDraft(emptyUser)
      setNotice(text.createdNotice)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.createError))
    }
  }

  async function updateUser(user: User) {
    setNotice('')
    setError('')
    try {
      await api.updateUser(user.id, {
        username: user.username,
        displayName: user.displayName,
        role: user.role as UserInput['role'],
        status: user.status,
      })
      setNotice(text.savedNotice)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.saveError))
    }
  }

  async function updatePassword(user: User) {
    const value = passwords[user.id]?.trim()
    if (!value) return
    setNotice('')
    setError('')
    if (!isStrongPassword(value)) {
      setError(passwordPolicyHelper)
      return
    }
    try {
      await api.updateUserPassword(user.id, value)
      setPasswords((current) => ({ ...current, [user.id]: '' }))
      setNotice(text.passwordUpdatedNotice)
    } catch (err) {
      setError(apiErrorMessage(err, text.passwordError))
    }
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

  function removeUser(user: User) {
    openConfirmDialog({
      message: text.deleteConfirm(user.username),
      confirmLabel: text.deleteUserAria,
      errorMessage: text.deleteFailure,
      action: async () => {
        await api.deleteUser(user.id)
        setSelectedIds((value) => value.filter((selectedId) => selectedId !== user.id))
        load()
      },
    })
  }

  function toggleUserPage(checked: boolean) {
    setSelectedIds((value) => togglePageSelection(value, selectableIds, checked))
  }

  function toggleUser(id: string) {
    setSelectedIds((value) => toggleSelection(value, id))
  }

  async function bulkUpdateStatus(nextStatus: User['status']) {
    const targets = selectedUsersForBulkAction(selectedIds, users, currentUser?.id)
    if (targets.length === 0) return

    setBulkBusy(true)
    setNotice('')
    setError('')
    const failures: { id: string; username: string; message: string }[] = []
    let updated = 0

    try {
      for (const user of targets) {
        try {
          await api.updateUser(user.id, {
            username: user.username,
            displayName: user.displayName,
            role: user.role as UserInput['role'],
            status: nextStatus,
          })
          updated += 1
        } catch (err) {
          failures.push({ id: user.id, username: user.username, message: apiErrorMessage(err, text.updateFailure )})
        }
      }

      setSelectedIds(failures.map((failure) => failure.id))
      load()
      if (failures.length > 0) {
        const detail = failures
          .slice(0, 3)
          .map((failure) => text.failureDetail(failure.username, failure.message))
          .join('; ')
        setError(text.bulkUpdateFailure(updated, failures.length, detail, failureMore(failures.length)))
      } else {
        setNotice(text.bulkStatusNotice(nextStatus === 'active' ? text.activeAction : text.disabledAction, updated))
      }
    } finally {
      setBulkBusy(false)
    }
  }

  function bulkDeleteUsers() {
    const targets = selectedUsersForBulkAction(selectedIds, users, currentUser?.id)
    if (targets.length === 0) return
    openConfirmDialog({
      message: text.bulkDeleteConfirm(targets.length),
      confirmLabel: text.bulkDelete,
      errorMessage: text.deleteFailure,
      action: async () => {
        await bulkDeleteUsersImmediately(targets)
      },
    })
  }

  async function bulkDeleteUsersImmediately(targets: User[]) {
    setBulkBusy(true)
    setNotice('')
    setError('')
    const failures: { id: string; username: string; message: string }[] = []
    let deleted = 0

    try {
      for (const user of targets) {
        try {
          await api.deleteUser(user.id)
          deleted += 1
        } catch (err) {
          failures.push({ id: user.id, username: user.username, message: apiErrorMessage(err, text.deleteFailure )})
        }
      }

      setSelectedIds(failures.map((failure) => failure.id))
      load()
      if (failures.length > 0) {
        const detail = failures
          .slice(0, 3)
          .map((failure) => text.failureDetail(failure.username, failure.message))
          .join('; ')
        setError(text.bulkDeleteFailure(deleted, failures.length, detail, failureMore(failures.length)))
      } else {
        setNotice(text.bulkDeleteNotice(deleted))
      }
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Chip label={text.totalChip(total)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
      </Stack>
      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Alert severity="info">{text.info}</Alert>

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
            <TextField select label={text.roleLabel} value={role} onChange={(event) => changeRole(event.target.value)} sx={{ minWidth: 160 }}>
              {roleOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label={text.statusLabel} value={status} onChange={(event) => changeStatus(event.target.value)} sx={{ minWidth: 160 }}>
              {statusOptions.map((option) => (
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
          <Stack component="form" direction={{ xs: 'column', lg: 'row' }} gap={2} onSubmit={createUser}>
            <TextField required label={text.username} value={draft.username} onChange={(event) => setDraft((value) => ({ ...value, username: event.target.value }))} />
            <TextField label={text.displayName} value={draft.displayName} onChange={(event) => setDraft((value) => ({ ...value, displayName: event.target.value }))} />
            <TextField
              required
              label={text.initialPassword}
              type="password"
              value={draft.password}
              onChange={(event) => setDraft((value) => ({ ...value, password: event.target.value }))}
              helperText={passwordPolicyHelper}
            />
            <TextField select label={text.roleLabel} value={draft.role} onChange={(event) => setDraft((value) => ({ ...value, role: event.target.value as UserInput['role'] }))} sx={{ minWidth: 140 }}>
              {roleOptions
                .filter((option) => option.value)
                .map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
            </TextField>
            <Button type="submit" variant="contained" startIcon={<Plus size={18} />}>
              {text.createUser}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState label={text.loadingPermissions} />
      ) : users.length === 0 ? (
        <EmptyState title={query || role || status ? text.emptyFiltered : text.empty} description={text.emptyDescription} />
      ) : (
        <Stack gap={2}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
                <Stack direction="row" gap={1} alignItems="center">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    indeterminate={someCurrentPageSelected}
                    onChange={(event) => toggleUserPage(event.target.checked)}
                    disabled={selectableIds.length === 0 || actionBusy}
                    inputProps={{ 'aria-label': text.bulkTitle }}
                  />
                  <Box>
                    <Typography fontWeight={900}>{text.bulkTitle}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {text.bulkSelected(selectedIds.length, selectableIds.length)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                  <Button startIcon={<UserCheck size={18} />} onClick={() => void bulkUpdateStatus('active')} disabled={selectedIds.length === 0 || actionBusy}>
                    {text.bulkEnable}
                  </Button>
                  <Button startIcon={<UserX size={18} />} onClick={() => void bulkUpdateStatus('disabled')} disabled={selectedIds.length === 0 || actionBusy}>
                    {text.bulkDisable}
                  </Button>
                  <Button color="error" startIcon={<Trash2 size={18} />} onClick={() => void bulkDeleteUsers()} disabled={selectedIds.length === 0 || actionBusy}>
                    {text.bulkDelete}
                  </Button>
                  <Button startIcon={<X size={18} />} onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0 || actionBusy}>
                    {text.clear}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <TableContainer>
              <Table sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allCurrentPageSelected}
                        indeterminate={someCurrentPageSelected}
                        onChange={(event) => toggleUserPage(event.target.checked)}
                        disabled={selectableIds.length === 0 || actionBusy}
                        inputProps={{ 'aria-label': text.bulkTitle }}
                      />
                    </TableCell>
                    <TableCell>{text.tableAccount}</TableCell>
                    <TableCell>{text.tableRole}</TableCell>
                    <TableCell>{text.tableStatus}</TableCell>
                    <TableCell>{text.tableLastLogin}</TableCell>
                    <TableCell>{text.tableResetPassword}</TableCell>
                    <TableCell align="right">{text.tableActions}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser = currentUser?.id === user.id
                    const selected = selectedIds.includes(user.id)
                    return (
                      <TableRow key={user.id} hover selected={selected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected}
                            disabled={isCurrentUser || actionBusy}
                            onChange={() => toggleUser(user.id)}
                            inputProps={{ 'aria-label': `${text.tableAccount} ${user.username}` }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography fontWeight={900}>{user.username}</Typography>
                              {isCurrentUser && <Chip size="small" color="primary" label={text.currentAccount} />}
                            </Stack>
                            <TextField
                              size="small"
                              label={text.displayName}
                              value={user.displayName}
                              onChange={(event) =>
                                setUsers((items) => items.map((item) => (item.id === user.id ? { ...item, displayName: event.target.value } : item)))
                              }
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack gap={1}>
                            <Chip size="small" label={roleName(user.role)} />
                            <TextField
                              select
                              size="small"
                              value={user.role}
                              disabled={isCurrentUser}
                              helperText={isCurrentUser ? text.currentRoleLocked : ' '}
                              onChange={(event) =>
                                setUsers((items) => items.map((item) => (item.id === user.id ? { ...item, role: event.target.value } : item)))
                              }
                              sx={{ minWidth: 150 }}
                            >
                              {roleOptions
                                .filter((option) => option.value)
                                .map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                            </TextField>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack gap={1}>
                            <Chip size="small" color={user.status === 'active' ? 'success' : 'default'} label={statusName(user.status)} />
                            <TextField
                              select
                              size="small"
                              value={user.status}
                              disabled={isCurrentUser}
                              helperText={isCurrentUser ? text.currentStatusLocked : ' '}
                              onChange={(event) =>
                                setUsers((items) =>
                                  items.map((item) => (item.id === user.id ? { ...item, status: event.target.value as User['status'] } : item)),
                                )
                              }
                              sx={{ minWidth: 150 }}
                            >
                              {statusOptions
                                .filter((option) => option.value)
                                .map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                            </TextField>
                          </Stack>
                        </TableCell>
                        <TableCell>{user.lastLoginAt ? formatDate(user.lastLoginAt, adminLanguage) : text.neverLoggedIn}</TableCell>
                        <TableCell>
                          <Stack direction="row" gap={1}>
                            <TextField
                              size="small"
                              type="password"
                              label={text.newPassword}
                              disabled={isCurrentUser}
                              helperText={isCurrentUser ? text.currentPasswordHelper : passwordPolicyHelper}
                              value={passwords[user.id] ?? ''}
                              onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                            />
                            <IconButton disabled={isCurrentUser} onClick={() => updatePassword(user)} aria-label={text.updatePasswordAria}>
                              <KeyRound size={18} />
                            </IconButton>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => updateUser(user)} aria-label={text.saveUserAria}>
                            <Save size={18} />
                          </IconButton>
                          <IconButton color="error" disabled={isCurrentUser || actionBusy} onClick={() => removeUser(user)} aria-label={text.deleteUserAria}>
                            <Trash2 size={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
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
        busy={actionBusy}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => void runConfirmDialogAction()}
      />
    </Stack>
  )
}
