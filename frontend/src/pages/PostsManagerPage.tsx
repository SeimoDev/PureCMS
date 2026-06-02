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
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Archive, Edit3, Eye, FileText, MessageCircle, Plus, RotateCcw, Search, Send, Star, StarOff, Trash2, UserRound, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { countSelectedInPage, togglePageSelection, toggleSelection } from '../bulkSelection'
import EmptyState from '../components/EmptyState'
import { formatDateTime } from '../components/format'
import LoadingState from '../components/LoadingState'
import { PostStatusChip } from '../components/StatusChip'
import { commonUIText } from '../commonUII18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { clampPage, pageCount } from '../pagination'
import { postAuthorLabel, postEngagementLabel } from '../postAdminMeta'
import { postsManagerUIText } from '../postsManagerI18n'
import { updatePostFilterParams, type PostFilterKey } from '../postFilters'
import { postInputWithFeatured, postInputWithStatus, selectedPostInputs } from '../posts'
import type { Category, Post, Tag } from '../types'

const adminPostPageSize = 20

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  color: 'warning' | 'error'
  action: () => Promise<void>
}

function isScheduled(post: Post) {
  return post.status === 'published' && post.publishedAt !== null && new Date(post.publishedAt).getTime() > Date.now()
}

export default function PostsManagerPage() {
  const { adminLanguage, isAdmin } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => postsManagerUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(adminPostPageSize)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [q, setQ] = useState(query)
  const status = searchParams.get('status') ?? ''
  const category = searchParams.get('category') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const featured = searchParams.get('featured') ?? ''
  const deleted = searchParams.get('deleted') === '1'
  const scheduled = searchParams.get('scheduled') === '1'
  const scope = deleted ? 'trash' : scheduled ? 'scheduled' : 'active'
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)
  const pagePostIds = posts.map((post) => post.id)
  const selectedInPage = countSelectedInPage(selectedIds, pagePostIds)
  const allCurrentPageSelected = posts.length > 0 && selectedInPage === pagePostIds.length
  const someCurrentPageSelected = selectedInPage > 0 && !allCurrentPageSelected

  function load() {
    setLoading(true)
    setError('')
    api
      .adminPostsPage({
        q: query,
        status,
        category,
        tag,
        featured: featured || undefined,
        deleted: deleted ? 1 : undefined,
        scheduled: scheduled ? 1 : undefined,
        limit: adminPostPageSize,
        page: currentPage,
      })
      .then((value) => {
        setPosts(value.items)
        setTotal(value.total)
        setPageLimit(value.limit)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadPostsError)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setQ(query)
  }, [query])

  useEffect(() => {
    Promise.all([api.adminCategories(), api.adminTags()])
      .then(([nextCategories, nextTags]) => {
        setCategories(nextCategories)
        setTags(nextTags)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadTaxonomyError)))
  }, [text.loadTaxonomyError])

  useEffect(load, [currentPage, query, status, category, tag, featured, deleted, scheduled, text.loadPostsError])

  useEffect(() => {
    setSelectedIds([])
  }, [category, deleted, featured, query, scheduled, status, tag])

  function changeFilter(key: PostFilterKey, value: string) {
    setSearchParams(updatePostFilterParams(searchParams, key, value))
  }

  function changeScope(value: string) {
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    if (value === 'trash') {
      params.set('deleted', '1')
      params.delete('scheduled')
    } else if (value === 'scheduled') {
      params.set('scheduled', '1')
      params.delete('deleted')
    } else {
      params.delete('deleted')
      params.delete('scheduled')
    }
    setSearchParams(params)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
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
      message: text.confirmMoveToTrash,
      confirmLabel: text.moveToTrash,
      color: 'warning',
      action: async () => {
        await api.deletePost(id)
        setSelectedIds((value) => value.filter((selectedId) => selectedId !== id))
        load()
      },
    })
  }

  async function restore(id: string) {
    await api.restorePost(id)
    setSelectedIds((value) => value.filter((selectedId) => selectedId !== id))
    load()
  }

  function removePermanently(id: string) {
    if (!isAdmin) return
    openConfirmDialog({
      message: text.confirmRemovePermanently,
      confirmLabel: text.deletePermanently,
      color: 'error',
      action: async () => {
        await api.permanentlyDeletePost(id)
        setSelectedIds((value) => value.filter((selectedId) => selectedId !== id))
        load()
      },
    })
  }

  function togglePagePosts(checked: boolean) {
    setSelectedIds((value) => togglePageSelection(value, pagePostIds, checked))
  }

  function togglePost(id: string) {
    setSelectedIds((value) => toggleSelection(value, id))
  }

  async function runBulkAction(action: (ids: string[]) => Promise<unknown>, successMessage: string) {
    const ids = [...selectedIds]
    if (ids.length === 0 || bulkBusy) return
    setBulkBusy(true)
    setNotice('')
    setError('')
    try {
      await action(ids)
      setSelectedIds([])
      setNotice(successMessage)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, text.bulkError))
    } finally {
      setBulkBusy(false)
    }
  }

  function bulkMoveToTrash() {
    const count = selectedIds.length
    openConfirmDialog({
      message: text.confirmBulkMoveToTrash(count),
      confirmLabel: text.moveToTrash,
      color: 'warning',
      action: async () => {
        await runBulkAction((ids) => Promise.all(ids.map((id) => api.deletePost(id))), text.movedToTrash(count))
      },
    })
  }

  async function bulkRestore() {
    await runBulkAction((ids) => Promise.all(ids.map((id) => api.restorePost(id))), text.restored(selectedIds.length))
  }

  function bulkRemovePermanently() {
    if (!isAdmin) return
    const count = selectedIds.length
    openConfirmDialog({
      message: text.confirmBulkRemovePermanently(count),
      confirmLabel: text.deletePermanently,
      color: 'error',
      action: async () => {
        await runBulkAction((ids) => Promise.all(ids.map((id) => api.permanentlyDeletePost(id))), text.removedPermanently(count))
      },
    })
  }

  async function bulkUpdateStatus(nextStatus: Post['status']) {
    const label = text.statusActionLabels[nextStatus]
    await runBulkAction(
      async (ids) => {
        const updates = await selectedPostInputs(ids, posts, api.adminPost, (post) => postInputWithStatus(post, nextStatus))
        await Promise.all(updates.map(({ id, input }) => api.updatePost(id, input)))
      },
      text.bulkStatusNotice(label, selectedIds.length),
    )
  }

  async function bulkUpdateFeatured(nextFeatured: boolean) {
    await runBulkAction(
      async (ids) => {
        const updates = await selectedPostInputs(ids, posts, api.adminPost, (post) => postInputWithFeatured(post, nextFeatured))
        await Promise.all(updates.map(({ id, input }) => api.updatePost(id, input)))
      },
      text.featuredNotice(selectedIds.length, nextFeatured),
    )
  }

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h4">{text.title}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Button component={Link} to="/admin/posts/new" variant="contained" startIcon={<Plus size={18} />}>
          {text.newPost}
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={2} flexWrap="wrap" useFlexGap onSubmit={submit}>
            <TextField
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={text.searchPlaceholder}
              sx={{ flex: { xs: '0 1 auto', md: '1 1 320px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField select label={text.statusLabel} value={status} onChange={(event) => changeFilter('status', event.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">{text.allStatuses}</MenuItem>
              <MenuItem value="published">{text.statusLabels.published}</MenuItem>
              <MenuItem value="draft">{text.statusLabels.draft}</MenuItem>
              <MenuItem value="archived">{text.statusLabels.archived}</MenuItem>
            </TextField>
            <TextField select label={text.scopeLabel} value={scope} onChange={(event) => changeScope(event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="active">{text.scopeActive}</MenuItem>
              <MenuItem value="scheduled">{text.scopeScheduled}</MenuItem>
              <MenuItem value="trash">{text.scopeTrash}</MenuItem>
            </TextField>
            <TextField select label={text.featuredLabel} value={featured} onChange={(event) => changeFilter('featured', event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">{text.allPosts}</MenuItem>
              <MenuItem value="1">{text.featuredOnly}</MenuItem>
              <MenuItem value="0">{text.nonFeatured}</MenuItem>
            </TextField>
            <TextField select label={text.categoryLabel} value={category} onChange={(event) => changeFilter('category', event.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="">{text.allCategories}</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item.id} value={item.slug}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label={text.tagLabel} value={tag} onChange={(event) => changeFilter('tag', event.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="">{text.allTags}</MenuItem>
              {tags.map((item) => (
                <MenuItem key={item.id} value={item.slug}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="outlined" startIcon={<Search size={18} />}>
              {text.search}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {!loading && (selectedIds.length > 0 || posts.length > 0) && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" gap={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Checkbox
                  checked={allCurrentPageSelected}
                  indeterminate={someCurrentPageSelected}
                  onChange={(event) => togglePagePosts(event.target.checked)}
                  disabled={posts.length === 0 || bulkBusy}
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
                    <Button size="small" variant="outlined" onClick={bulkRestore} disabled={selectedIds.length === 0 || bulkBusy} startIcon={<RotateCcw size={16} />}>
                      {text.bulkRestore}
                    </Button>
                    {isAdmin && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={bulkRemovePermanently}
                        disabled={selectedIds.length === 0 || bulkBusy}
                        startIcon={<Trash2 size={16} />}
                      >
                        {text.deletePermanently}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdateStatus('published')}
                      disabled={selectedIds.length === 0 || bulkBusy}
                      startIcon={<Send size={16} />}
                    >
                      {text.bulkPublish}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdateStatus('draft')}
                      disabled={selectedIds.length === 0 || bulkBusy}
                      startIcon={<FileText size={16} />}
                    >
                      {text.toDraft}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdateStatus('archived')}
                      disabled={selectedIds.length === 0 || bulkBusy}
                      startIcon={<Archive size={16} />}
                    >
                      {text.bulkArchive}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdateFeatured(true)}
                      disabled={selectedIds.length === 0 || bulkBusy}
                      startIcon={<Star size={16} />}
                    >
                      {text.markFeatured}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void bulkUpdateFeatured(false)}
                      disabled={selectedIds.length === 0 || bulkBusy}
                      startIcon={<StarOff size={16} />}
                    >
                      {text.unmarkFeatured}
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={bulkMoveToTrash} disabled={selectedIds.length === 0 || bulkBusy} startIcon={<Trash2 size={16} />}>
                      {text.moveToTrash}
                    </Button>
                  </>
                )}
                <Button size="small" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0 || bulkBusy} startIcon={<X size={16} />}>
                  {text.clear}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <LoadingState label={commonText.loading} />
      ) : posts.length === 0 ? (
        <EmptyState title={deleted ? text.emptyTrash : scheduled ? text.emptyScheduled : text.emptyPosts} />
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      indeterminate={someCurrentPageSelected}
                      onChange={(event) => togglePagePosts(event.target.checked)}
                      disabled={posts.length === 0 || bulkBusy}
                      inputProps={{ 'aria-label': text.selectPageAria }}
                    />
                  </TableCell>
                  <TableCell>{text.tableTitle}</TableCell>
                  <TableCell>{text.tableStatus}</TableCell>
                  <TableCell>{text.tableCategory}</TableCell>
                  <TableCell>{text.tableOperations}</TableCell>
                  <TableCell>{text.tablePublishedAt}</TableCell>
                  <TableCell align="right">{text.tableActions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id} hover selected={selectedIds.includes(post.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedIds.includes(post.id)} onChange={() => togglePost(post.id)} disabled={bulkBusy} inputProps={{ 'aria-label': text.selectPostAria(post.title) }} />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={800}>{post.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          /posts/{post.slug}
                        </Typography>
                        {post.deletedAt && (
                          <Typography variant="caption" color="error">
                            {text.deletedAt(formatDateTime(post.deletedAt, adminLanguage, text.notSet))}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
                        <PostStatusChip status={post.status} labels={text.statusLabels} />
                        {post.featured && <Chip size="small" label={text.featuredChip} color="secondary" />}
                        {isScheduled(post) && <Chip size="small" label={text.scheduledChip} color="info" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
                        {post.categories.map((category) => (
                          <Chip key={category.id} size="small" label={category.name} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack gap={0.75}>
                        <Stack direction="row" gap={0.75} alignItems="center" color="text.secondary">
                          <UserRound size={14} />
                          <Typography variant="caption">{postAuthorLabel(post, text.meta)}</Typography>
                        </Stack>
                        <Stack direction="row" gap={0.75} alignItems="center" color="text.secondary">
                          <MessageCircle size={14} />
                          <Typography variant="caption">{postEngagementLabel(post, text.meta)}</Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDateTime(post.publishedAt, adminLanguage, text.notSet)}</TableCell>
                    <TableCell align="right">
                      {deleted ? (
                        <>
                          <IconButton onClick={() => restore(post.id)} aria-label={text.restorePostAria}>
                            <RotateCcw size={18} />
                          </IconButton>
                          {isAdmin && (
                          <IconButton color="error" onClick={() => removePermanently(post.id)} aria-label={text.permanentlyDeleteAria}>
                            <Trash2 size={18} />
                          </IconButton>
                          )}
                        </>
                      ) : (
                        <>
                          <IconButton component={Link} to={`/admin/preview/posts/${post.id}`} aria-label={text.previewAria}>
                            <Eye size={18} />
                          </IconButton>
                          <IconButton component={Link} to={`/admin/posts/${post.id}`} aria-label={text.editAria}>
                            <Edit3 size={18} />
                          </IconButton>
                          <IconButton color="error" onClick={() => remove(post.id)} aria-label={text.trashAria}>
                            <Trash2 size={18} />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <CardContent sx={{ borderTop: '1px solid rgba(37, 107, 87, 0.12)' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                {text.paginationSummary(total, visiblePage, pages)}
              </Typography>
              <Pagination count={pages} page={visiblePage} color="primary" onChange={(_, value) => changePage(value)} siblingCount={1} boundaryCount={1} />
            </Stack>
          </CardContent>
        </Card>
      )}
      <Dialog open={Boolean(confirmDialog)} onClose={() => (!confirmBusy && !bulkBusy ? setConfirmDialog(null) : undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>{commonText.destructiveAction}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)} disabled={confirmBusy || bulkBusy}>
            {commonText.cancel}
          </Button>
          <Button variant="contained" color={confirmDialog?.color ?? 'warning'} onClick={() => void runConfirmDialogAction()} disabled={confirmBusy || bulkBusy}>
            {confirmDialog?.confirmLabel ?? commonText.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
