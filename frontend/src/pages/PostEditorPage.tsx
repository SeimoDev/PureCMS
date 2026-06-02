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
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Eye, ImagePlus, Images, RotateCcw, Save, Search, Upload } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import AdminConfirmDialog from '../components/AdminConfirmDialog'
import { formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import MarkdownToolbar from '../components/MarkdownToolbar'
import { commonUIText } from '../commonUII18n'
import {
  parsePostDraft,
  postDraftKey,
  serializePostDraft,
  shouldStorePostDraft,
  type PostDraftSnapshot,
} from '../editorDraft'
import { languageOptionLabel, supportedLanguages } from '../i18n'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { appendMarkdownBlock, imageUploadAccept, isImageMimeType, mediaMarkdownImage } from '../media'
import { formatPostDraftSavedAt, postEditorUIText } from '../postEditorI18n'
import type { Category, MediaAsset, Post, PostInput, PostRevision, Tag } from '../types'

const emptyPost: PostInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  sourceLanguage: 'zh-CN',
  coverUrl: '',
  status: 'draft',
  featured: false,
  seoTitle: '',
  seoDescription: '',
  categoryIds: [],
  tagIds: [],
  publishedAt: null,
}

type ConfirmDialogState = {
  message: string
  confirmLabel: string
  action: () => Promise<void>
}

function toInput(post: Post): PostInput {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    sourceLanguage: post.sourceLanguage || 'zh-CN',
    coverUrl: post.coverUrl,
    status: post.status,
    featured: post.featured,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    categoryIds: post.categories.map((item) => item.id),
    tagIds: post.tags.map((item) => item.id),
    publishedAt: post.publishedAt,
  }
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  if (!value) return null
  return new Date(value).toISOString()
}

export default function PostEditorPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => postEditorUIText(adminLanguage), [adminLanguage])
  const commonText = useMemo(() => commonUIText(adminLanguage), [adminLanguage])
  const [form, setForm] = useState<PostInput>(emptyPost)
  const [baseForm, setBaseForm] = useState<PostInput>(emptyPost)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [revisions, setRevisions] = useState<PostRevision[]>([])
  const [draftPrompt, setDraftPrompt] = useState<PostDraftSnapshot | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState('')
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [mediaDialogMode, setMediaDialogMode] = useState<'cover' | 'insert'>('insert')
  const [mediaKeyword, setMediaKeyword] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaAltText, setMediaAltText] = useState('')
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaMessage, setMediaMessage] = useState('')
  const [mediaError, setMediaError] = useState('')
  const [loading, setLoading] = useState(editing)
  const [editorReady, setEditorReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setEditorReady(false)
    Promise.all([
      api.adminCategories(),
      api.adminTags(),
      api.media(),
      id ? api.adminPost(id) : Promise.resolve(null),
      id ? api.postRevisions(id) : Promise.resolve([]),
    ])
      .then(([categoriesValue, tagsValue, mediaValue, post, revisionValue]) => {
        const loadedForm = post ? toInput(post) : emptyPost
        setCategories(categoriesValue)
        setTags(tagsValue)
        setMedia(mediaValue)
        setRevisions(revisionValue)
        setForm(loadedForm)
        setBaseForm(loadedForm)
        setDraftSavedAt('')
        const draft = parsePostDraft(localStorage.getItem(postDraftKey(id)))
        setDraftPrompt(draft && shouldStorePostDraft(draft.form, loadedForm) ? draft : null)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => {
        setLoading(false)
        setEditorReady(true)
      })
  }, [id, text.loadError])

  useEffect(() => {
    if (!editorReady || loading || draftPrompt) return
    const key = postDraftKey(id)
    if (!shouldStorePostDraft(form, baseForm)) {
      localStorage.removeItem(key)
      setDraftSavedAt('')
      return
    }

    const timeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString()
      localStorage.setItem(key, serializePostDraft(form, savedAt))
      setDraftSavedAt(savedAt)
    }, 800)

    return () => window.clearTimeout(timeout)
  }, [baseForm, draftPrompt, editorReady, form, id, loading])

  useEffect(() => {
    if (!shouldStorePostDraft(form, baseForm)) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [baseForm, form])

  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const tagNames = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags])
  const imageAssets = media.filter((asset) => isImageMimeType(asset.mimeType))
  const recentImageAssets = imageAssets.slice(0, 4)
  const visibleMedia = imageAssets.filter((asset) => {
    const keyword = mediaKeyword.trim().toLowerCase()
    if (!keyword) return true
    return [asset.originalName, asset.altText, asset.url, asset.mimeType].some((value) => value.toLowerCase().includes(keyword))
  })
  const scheduled = form.status === 'published' && form.publishedAt ? new Date(form.publishedAt).getTime() > Date.now() : false

  function patch(value: Partial<PostInput>) {
    setForm((current) => ({ ...current, ...value }))
  }

  function draftTime(value: string) {
    return formatPostDraftSavedAt(value, text)
  }

  function clearLocalDraft() {
    localStorage.removeItem(postDraftKey(id))
    setDraftPrompt(null)
    setDraftSavedAt('')
  }

  function restoreLocalDraft() {
    if (!draftPrompt) return
    const savedAt = new Date().toISOString()
    localStorage.setItem(postDraftKey(id), serializePostDraft(draftPrompt.form, savedAt))
    setForm(draftPrompt.form)
    setDraftPrompt(null)
    setDraftSavedAt(savedAt)
    setNotice(text.localDraftRestored)
    setError('')
  }

  function discardLocalDraft() {
    clearLocalDraft()
    setNotice(text.localDraftCleared)
    setError('')
  }

  function insertImage(asset: MediaAsset) {
    patch({ content: appendMarkdownBlock(form.content, mediaMarkdownImage(asset)) })
  }

  function openMediaDialog(mode: 'cover' | 'insert') {
    setMediaDialogMode(mode)
    setMediaDialogOpen(true)
    setMediaMessage('')
    setMediaError('')
  }

  function chooseMedia(asset: MediaAsset) {
    if (mediaDialogMode === 'cover') {
      patch({ coverUrl: asset.url })
      setMediaMessage(text.coverSelected)
    } else {
      insertImage(asset)
      setMediaMessage(text.contentInserted)
    }
    setMediaDialogOpen(false)
  }

  async function uploadEditorMedia() {
    if (!mediaFile) return
    setMediaUploading(true)
    setMediaMessage('')
    setMediaError('')
    try {
      const asset = await api.uploadMedia(mediaFile, mediaAltText)
      setMedia((items) => [asset, ...items.filter((item) => item.id !== asset.id)])
      setMediaFile(null)
      setMediaAltText('')
      setMediaKeyword('')
      setMediaMessage(text.mediaUploaded)
    } catch (err) {
      setMediaError(apiErrorMessage(err, text.uploadMediaError))
    } finally {
      setMediaUploading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = { ...form, publishedAt: form.status === 'published' ? form.publishedAt : null }
      const result = id ? await api.updatePost(id, payload) : await api.createPost(payload)
      clearLocalDraft()
      if (id) {
        const savedForm = toInput(result)
        setForm(savedForm)
        setBaseForm(savedForm)
        setRevisions(await api.postRevisions(id))
        setNotice(text.saveSuccess)
      } else {
        navigate(`/admin/posts/${result.id}`, { replace: true })
      }
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
    setError('')
    setNotice('')
    try {
      await action()
      setConfirmDialog(null)
    } catch (err) {
      setError(apiErrorMessage(err, text.restoreError))
    } finally {
      setConfirmBusy(false)
    }
  }

  function restore(revision: PostRevision) {
    if (!id) return
    openConfirmDialog({
      message: text.restoreConfirm(revision.versionNumber),
      confirmLabel: text.restore,
      action: async () => {
        await restoreImmediately(id, revision)
      },
    })
  }

  async function restoreImmediately(postId: string, revision: PostRevision) {
    setError('')
    setNotice('')
    try {
      const post = await api.restorePostRevision(postId, revision.id)
      const restoredForm = toInput(post)
      setForm(restoredForm)
      setBaseForm(restoredForm)
      clearLocalDraft()
      setRevisions(await api.postRevisions(postId))
      setNotice(text.restoreSuccess(revision.versionNumber))
    } catch (err) {
      setError(apiErrorMessage(err, text.restoreError))
    }
  }

  if (loading) return <LoadingState label={text.loading} />

  return (
    <Stack component="form" gap={3} onSubmit={submit}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{editing ? text.editTitle : text.newTitle}</Typography>
          <Typography color="text.secondary">{text.subtitle}</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          {id && (
            <Button component={Link} to={`/admin/preview/posts/${id}`} variant="outlined" startIcon={<Eye size={18} />}>
              {text.preview}
            </Button>
          )}
          {draftSavedAt && !draftPrompt && (
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {text.savedDraftAt(draftTime(draftSavedAt))}
            </Typography>
          )}
          <Button type="submit" variant="contained" startIcon={<Save size={18} />} disabled={saving}>
            {text.save}
          </Button>
        </Stack>
      </Stack>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {draftPrompt && (
        <Alert
          severity="warning"
          action={
            <Stack direction="row" gap={1}>
              <Button type="button" color="inherit" size="small" onClick={restoreLocalDraft}>
                {text.restore}
              </Button>
              <Button type="button" color="inherit" size="small" onClick={discardLocalDraft}>
                {text.clear}
              </Button>
            </Stack>
          }
        >
          {text.foundLocalDraft(draftTime(draftPrompt.savedAt))}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 380px' }, alignItems: 'start' }}>
        <Stack gap={3} sx={{ minWidth: 0 }}>
          <Card>
            <CardContent>
              <Stack gap={2}>
                <TextField required label={text.title} value={form.title} onChange={(event) => patch({ title: event.target.value })} />
                <TextField label={text.slug} value={form.slug} onChange={(event) => patch({ slug: event.target.value })} placeholder={text.slugPlaceholder} />
                <TextField label={text.excerpt} value={form.excerpt} onChange={(event) => patch({ excerpt: event.target.value })} multiline minRows={3} />
                <MarkdownToolbar value={form.content} onChange={(content) => patch({ content })} textareaRef={contentRef} text={text.toolbar} />
                <TextField
                  required
                  label={text.content}
                  value={form.content}
                  onChange={(event) => patch({ content: event.target.value })}
                  multiline
                  minRows={16}
                  inputRef={contentRef}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <Typography variant="h6">{text.seo}</Typography>
                <TextField label={text.seoTitle} value={form.seoTitle} onChange={(event) => patch({ seoTitle: event.target.value })} />
                <TextField label={text.seoDescription} value={form.seoDescription} onChange={(event) => patch({ seoDescription: event.target.value })} multiline minRows={3} />
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Stack gap={3} sx={{ minWidth: 0 }}>
          <Card>
            <CardContent>
              <Stack gap={2}>
                <TextField select label={text.status} value={form.status} onChange={(event) => patch({ status: event.target.value as PostInput['status'] })}>
                  <MenuItem value="draft">{text.draft}</MenuItem>
                  <MenuItem value="published">{text.published}</MenuItem>
                  <MenuItem value="archived">{text.archived}</MenuItem>
                </TextField>
                <TextField
                  select
                  label={text.sourceLanguage}
                  value={form.sourceLanguage}
                  onChange={(event) => patch({ sourceLanguage: event.target.value })}
                  helperText={text.sourceLanguageHelper}
                >
                  {supportedLanguages.map((language) => (
                    <MenuItem key={language.code} value={language.code}>
                      {languageOptionLabel(language)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={text.publishedAt}
                  type="datetime-local"
                  value={toDatetimeLocal(form.publishedAt)}
                  onChange={(event) => patch({ publishedAt: fromDatetimeLocal(event.target.value) })}
                  helperText={form.status === 'published' ? text.publishHelperPublished : text.publishHelperHidden}
                  InputLabelProps={{ shrink: true }}
                />
                {scheduled && <Alert severity="info">{text.scheduledNotice}</Alert>}
                <FormControlLabel control={<Switch checked={form.featured} onChange={(event) => patch({ featured: event.target.checked })} />} label={text.featured} />
                <TextField label={text.coverUrl} value={form.coverUrl} onChange={(event) => patch({ coverUrl: event.target.value })} />
                <Button type="button" variant="outlined" startIcon={<Images size={18} />} onClick={() => openMediaDialog('cover')}>
                  {text.chooseCover}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <Box>
                  <Typography variant="h6">{text.mediaTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.mediaSubtitle}
                  </Typography>
                </Box>
                <Button type="button" variant="contained" startIcon={<ImagePlus size={18} />} onClick={() => openMediaDialog('insert')}>
                  {text.openMediaLibrary}
                </Button>
                {imageAssets.length === 0 ? (
                  <Typography color="text.secondary">{text.noImages}</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    {recentImageAssets.map((asset) => (
                      <Card key={asset.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                        <Box sx={{ height: 88, background: `url(${asset.url}) center/cover` }} />
                        <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
                          <Typography variant="caption" title={asset.originalName} noWrap display="block">
                            {asset.originalName}
                          </Typography>
                          <Stack direction="row" gap={0.5} sx={{ mt: 1 }}>
                            <Button type="button" size="small" onClick={() => patch({ coverUrl: asset.url })}>
                              {text.cover}
                            </Button>
                            <Button type="button" size="small" startIcon={<ImagePlus size={14} />} onClick={() => insertImage(asset)}>
                              {text.insert}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack gap={2}>
                <FormControl>
                  <InputLabel id="category-select">{text.categories}</InputLabel>
                  <Select
                    labelId="category-select"
                    multiple
                    value={form.categoryIds}
                    onChange={(event) => patch({ categoryIds: event.target.value as string[] })}
                    input={<OutlinedInput label={text.categories} />}
                    renderValue={(selected) => selected.map((value) => categoryNames.get(value)).filter(Boolean).join(text.selectionSeparator)}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        <Checkbox checked={form.categoryIds.includes(category.id)} />
                        <ListItemText primary={category.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <InputLabel id="tag-select">{text.tags}</InputLabel>
                  <Select
                    labelId="tag-select"
                    multiple
                    value={form.tagIds}
                    onChange={(event) => patch({ tagIds: event.target.value as string[] })}
                    input={<OutlinedInput label={text.tags} />}
                    renderValue={(selected) => selected.map((value) => tagNames.get(value)).filter(Boolean).join(text.selectionSeparator)}
                  >
                    {tags.map((tag) => (
                      <MenuItem key={tag.id} value={tag.id}>
                        <Checkbox checked={form.tagIds.includes(tag.id)} />
                        <ListItemText primary={tag.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {editing && (
            <Card>
              <CardContent>
                <Stack gap={2}>
                  <Box>
                    <Typography variant="h6">{text.revisions}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {text.revisionsSubtitle}
                    </Typography>
                  </Box>
                  {revisions.length === 0 ? (
                    <Typography color="text.secondary">{text.noRevisions}</Typography>
                  ) : (
                    revisions.map((revision) => (
                      <Stack key={revision.id} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" gap={1} alignItems="center">
                            <Chip size="small" label={`v${revision.versionNumber}`} color="primary" />
                            <Typography fontWeight={800} noWrap>
                              {revision.title}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(revision.createdAt, adminLanguage)}
                          </Typography>
                        </Box>
                        <Button size="small" startIcon={<RotateCcw size={16} />} onClick={() => restore(revision)} disabled={confirmBusy}>
                          {text.restore}
                        </Button>
                      </Stack>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>

      <Dialog open={mediaDialogOpen} onClose={() => setMediaDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{mediaDialogMode === 'cover' ? text.chooseCoverDialog : text.insertMediaDialog}</DialogTitle>
        <DialogContent>
          <Stack gap={2.5} sx={{ pt: 1 }}>
            {mediaMessage && <Alert severity="success">{mediaMessage}</Alert>}
            {mediaError && <Alert severity="error">{mediaError}</Alert>}
            <Card variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }}>
                  <Button variant="outlined" component="label" startIcon={<Upload size={18} />}>
                    {text.uploadImage}
                    <input hidden type="file" accept={imageUploadAccept} onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} />
                  </Button>
                  <Typography color="text.secondary" sx={{ minWidth: 160 }} noWrap title={mediaFile?.name}>
                    {mediaFile ? mediaFile.name : text.noFileSelected}
                  </Typography>
                  <TextField size="small" label={text.altText} value={mediaAltText} onChange={(event) => setMediaAltText(event.target.value)} sx={{ flex: 1 }} />
                  <Button type="button" variant="contained" disabled={!mediaFile || mediaUploading} onClick={uploadEditorMedia}>
                    {mediaUploading ? text.uploading : text.upload}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <TextField
              value={mediaKeyword}
              onChange={(event) => setMediaKeyword(event.target.value)}
              placeholder={text.mediaSearchPlaceholder}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />

            {visibleMedia.length === 0 ? (
              <Typography color="text.secondary">{text.noMatchedImages}</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' } }}>
                {visibleMedia.map((asset) => (
                  <Card key={asset.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Box sx={{ height: 128, background: `url(${asset.url}) center/cover` }} />
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack gap={1}>
                        <Typography variant="body2" fontWeight={900} title={asset.originalName} noWrap>
                          {asset.originalName}
                        </Typography>
                        {asset.altText && (
                          <Typography variant="caption" color="text.secondary" title={asset.altText} noWrap>
                            {asset.altText}
                          </Typography>
                        )}
                        <Button type="button" size="small" variant="outlined" onClick={() => chooseMedia(asset)}>
                          {mediaDialogMode === 'cover' ? text.setAsCover : text.insertIntoContent}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setMediaDialogOpen(false)}>
            {text.close}
          </Button>
        </DialogActions>
      </Dialog>
      <AdminConfirmDialog
        open={Boolean(confirmDialog)}
        title={commonText.destructiveAction}
        message={confirmDialog?.message ?? ''}
        cancelLabel={commonText.cancel}
        confirmLabel={confirmDialog?.confirmLabel ?? commonText.confirm}
        color="warning"
        busy={confirmBusy}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => void runConfirmDialogAction()}
      />
    </Stack>
  )
}
