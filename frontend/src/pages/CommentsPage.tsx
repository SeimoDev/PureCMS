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
  DialogTitle,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Check, Reply, Search, ShieldAlert, Trash2, Undo2, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { commentAuditItems } from '../commentAudit'
import {
  countSelectedCommentsInPage,
  toggleCommentPageSelection,
  toggleCommentSelection,
} from '../commentBulkActions'
import { commentsPageUIText } from '../commentsPageI18n'
import AdminConfirmDialog from '../components/AdminConfirmDialog'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import { CommentStatusChip } from '../components/StatusChip'
import { commonUIText } from '../commonUII18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { clampPage, pageCount } from '../pagination'
import type { Comment } from '../types'

const commentPageSize = 20

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  action: () => Promise<void>
}

export default function CommentsPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => commentsPageUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(commentPageSize)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [keyword, setKeyword] = useState(query)
  const status = searchParams.get('status') ?? ''
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const pageCommentIds = comments.map((comment) => comment.id)
  const selectedInPage = countSelectedCommentsInPage(selectedIds, pageCommentIds)
  const allCurrentPageSelected = comments.length > 0 && selectedInPage === pageCommentIds.length
  const someCurrentPageSelected = selectedInPage > 0 && !allCurrentPageSelected
  const actionBusy = bulkBusy || confirmBusy

  function load() {
    setLoading(true)
    setError('')
    api
      .commentsPage({ q: query, status, limit: commentPageSize, page: currentPage })
      .then((value) => {
        setComments(value.items)
        setTotal(value.total)
        setPageLimit(value.limit)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(load, [currentPage, query, status, text.loadError])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
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

  async function moderate(id: string, nextStatus: Comment['status']) {
    await api.moderateComment(id, nextStatus)
    setSelectedIds((value) => value.filter((selectedId) => selectedId !== id))
    load()
  }

  function openConfirmDialog(next: ConfirmDialogState) {
    setConfirmDialog(next)
  }

  async function runConfirmDialogAction() {
    if (!confirmDialog || confirmBusy) return
    const action = confirmDialog.action
    setConfirmBusy(true)
    setError('')
    try {
      await action()
      setConfirmDialog(null)
    } catch (err) {
      setError(apiErrorMessage(err, text.bulkError))
    } finally {
      setConfirmBusy(false)
    }
  }

  function remove(id: string) {
    openConfirmDialog({
      message: text.deleteConfirm,
      confirmLabel: text.delete,
      action: async () => {
        await api.deleteComment(id)
        setSelectedIds((value) => value.filter((selectedId) => selectedId !== id))
        load()
      },
    })
  }

  function togglePageSelection(checked: boolean) {
    setSelectedIds((value) => toggleCommentPageSelection(value, pageCommentIds, checked))
  }

  function toggleSingleSelection(id: string) {
    setSelectedIds((value) => toggleCommentSelection(value, id))
  }

  async function runBulkAction(action: (ids: string[]) => Promise<unknown>) {
    const ids = [...selectedIds]
    if (ids.length === 0 || bulkBusy) return
    setBulkBusy(true)
    setError('')
    try {
      await action(ids)
      setSelectedIds([])
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.bulkError))
    } finally {
      setBulkBusy(false)
    }
  }

  async function bulkModerate(nextStatus: Comment['status']) {
    await runBulkAction((ids) => Promise.all(ids.map((id) => api.moderateComment(id, nextStatus))))
  }

  function bulkRemove() {
    const count = selectedIds.length
    openConfirmDialog({
      message: text.bulkDeleteConfirm(count),
      confirmLabel: text.bulkDelete,
      action: async () => {
        await runBulkAction((ids) => Promise.all(ids.map((id) => api.deleteComment(id))))
      },
    })
  }

  function openReply(comment: Comment) {
    setReplyTarget(comment)
    setReplyContent('')
    setReplyError('')
  }

  function closeReply() {
    if (replying) return
    setReplyTarget(null)
    setReplyContent('')
    setReplyError('')
  }

  async function submitReply() {
    if (!replyTarget) return
    const content = replyContent.trim()
    if (!content) {
      setReplyError(text.replyRequired)
      return
    }
    setReplying(true)
    setReplyError('')
    try {
      await api.replyComment(replyTarget.id, content)
      setReplyTarget(null)
      setReplyContent('')
      load()
    } catch (err) {
      setReplyError(apiErrorMessage(err, text.replyError))
    } finally {
      setReplying(false)
    }
  }

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
      </Stack>

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
            <TextField select label={text.statusLabel} value={status} onChange={(event) => changeStatus(event.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">{text.allStatuses}</MenuItem>
              <MenuItem value="pending">{text.statusLabels.pending}</MenuItem>
              <MenuItem value="approved">{text.statusLabels.approved}</MenuItem>
              <MenuItem value="spam">{text.statusLabels.spam}</MenuItem>
            </TextField>
            <Button type="submit" variant="outlined" startIcon={<Search size={18} />}>
              {text.search}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {!loading && (selectedIds.length > 0 || comments.length > 0) && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" gap={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Checkbox
                  checked={allCurrentPageSelected}
                  indeterminate={someCurrentPageSelected}
                  onChange={(event) => togglePageSelection(event.target.checked)}
                  disabled={comments.length === 0 || actionBusy}
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
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => bulkModerate('approved')}
                  disabled={selectedIds.length === 0 || actionBusy}
                  startIcon={<Check size={16} />}
                >
                  {text.bulkApprove}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => bulkModerate('pending')}
                  disabled={selectedIds.length === 0 || actionBusy}
                  startIcon={<Undo2 size={16} />}
                >
                  {text.setPending}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => bulkModerate('spam')}
                  disabled={selectedIds.length === 0 || actionBusy}
                  startIcon={<ShieldAlert size={16} />}
                >
                  {text.markSpam}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={bulkRemove}
                  disabled={selectedIds.length === 0 || actionBusy}
                  startIcon={<Trash2 size={16} />}
                >
                  {text.bulkDelete}
                </Button>
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

      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <LoadingState label={text.loading} />
      ) : comments.length === 0 ? (
        <EmptyState title={text.empty} description={text.emptyDescription} />
      ) : (
        <Stack gap={2}>
          {comments.map((comment) => {
            const auditItems = commentAuditItems(comment, text.auditLabels)
            return (
              <Card
                key={comment.id}
                sx={{
                  borderColor: selectedIds.includes(comment.id) ? 'primary.main' : undefined,
                  boxShadow: selectedIds.includes(comment.id) ? '0 0 0 1px rgba(37, 107, 87, 0.18)' : undefined,
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" gap={1.5}>
                    <Checkbox
                      checked={selectedIds.includes(comment.id)}
                      onChange={() => toggleSingleSelection(comment.id)}
                      disabled={actionBusy}
                      inputProps={{ 'aria-label': text.selectCommentAria(comment.authorName) }}
                      sx={{ mt: -0.75 }}
                    />
                    <Stack gap={2} flex={1} minWidth={0}>
                      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
                        <Box>
                          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography fontWeight={900}>{comment.authorName}</Typography>
                            <CommentStatusChip status={comment.status} labels={text.statusLabels} />
                            {comment.isAdminReply && <Chip size="small" color="primary" label={text.adminReply} />}
                            {comment.parentAuthorName && <Chip size="small" label={text.replyTo(comment.parentAuthorName)} variant="outlined" />}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {text.commentedOn} <Link to={`/posts/${comment.postSlug}`}>{comment.postTitle}</Link> - {formatDate(comment.createdAt, adminLanguage)}
                          </Typography>
                          {auditItems.length > 0 && (
                            <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                              {auditItems.map((item) => (
                                <Chip
                                  key={`${comment.id}-${item.label}`}
                                  size="small"
                                  component={item.href ? 'a' : 'div'}
                                  href={item.href}
                                  target={item.href ? '_blank' : undefined}
                                  rel={item.href ? 'noreferrer' : undefined}
                                  clickable={Boolean(item.href)}
                                  variant="outlined"
                                  label={`${item.label}: ${item.value}`}
                                  title={item.value}
                                  sx={{
                                    maxWidth: { xs: '100%', md: item.label === text.auditLabels.userAgent ? 420 : 260 },
                                    '& .MuiChip-label': {
                                      display: 'block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    },
                                  }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                          <Button size="small" onClick={() => openReply(comment)} startIcon={<Reply size={16} />}>
                            {text.reply}
                          </Button>
                          <Button size="small" onClick={() => moderate(comment.id, 'approved')} startIcon={<Check size={16} />}>
                            {text.approve}
                          </Button>
                          <Button size="small" color="warning" onClick={() => moderate(comment.id, 'pending')} startIcon={<Undo2 size={16} />}>
                            {text.pending}
                          </Button>
                          <Button size="small" color="error" onClick={() => moderate(comment.id, 'spam')} startIcon={<ShieldAlert size={16} />}>
                            {text.spam}
                          </Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => remove(comment.id)} startIcon={<Trash2 size={16} />}>
                            {text.delete}
                          </Button>
                        </Stack>
                      </Stack>
                      <Typography className="user-content" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                        {comment.content}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
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

      <Dialog open={Boolean(replyTarget)} onClose={closeReply} fullWidth maxWidth="sm">
        <DialogTitle>{text.replyDialogTitle}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            {replyTarget && <Alert severity="info">{text.replyContext(replyTarget.authorName, replyTarget.postTitle)}</Alert>}
            {replyError && <Alert severity="error">{replyError}</Alert>}
            <TextField
              label={text.replyContent}
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              multiline
              minRows={5}
              fullWidth
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReply} disabled={replying}>
            {text.cancel}
          </Button>
          <Button variant="contained" onClick={submitReply} disabled={replying} startIcon={<Reply size={16} />}>
            {text.publishReply}
          </Button>
        </DialogActions>
      </Dialog>
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
