import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ListPlus, Plus, Save, Trash2, X } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import LoadingState from '../components/LoadingState'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { parseTaxonomyBatchInput } from '../taxonomyBatch'
import { taxonomyPageUIText } from '../taxonomyPageI18n'
import { taxonomyDeleteDisabledReason, taxonomyUsageLabel } from '../taxonomyUsage'
import type { Category, Tag } from '../types'

type CategoryDraft = Pick<Category, 'name' | 'slug' | 'description' | 'sortOrder'>
type TagDraft = Pick<Tag, 'name' | 'slug'>
type TaxonomyKind = 'category' | 'tag'

const emptyCategory: CategoryDraft = { name: '', slug: '', description: '', sortOrder: 0 }
const emptyTag: TagDraft = { name: '', slug: '' }

export default function TaxonomyPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => taxonomyPageUIText(adminLanguage), [adminLanguage])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory)
  const [tagDraft, setTagDraft] = useState<TagDraft>(emptyTag)
  const [categoryBatch, setCategoryBatch] = useState('')
  const [tagBatch, setTagBatch] = useState('')
  const [batchBusy, setBatchBusy] = useState<TaxonomyKind | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const categoryBatchParsed = parseTaxonomyBatchInput(categoryBatch)
  const tagBatchParsed = parseTaxonomyBatchInput(tagBatch)
  const batchActionBusy = batchBusy !== null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [categoriesValue, tagsValue] = await Promise.all([api.adminCategories(), api.adminTags()])
      setCategories(categoriesValue)
      setTags(tagsValue)
    } catch (err) {
      setError(apiErrorMessage(err, text.loadError))
    } finally {
      setLoading(false)
    }
  }, [text.loadError])

  useEffect(() => {
    void load()
  }, [load])

  async function createCategory(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setError('')
    try {
      await api.createCategory(categoryDraft)
      setCategoryDraft(emptyCategory)
      setNotice(text.createdNotice(text.category))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.createError(text.category)))
    }
  }

  async function createTag(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setError('')
    try {
      await api.createTag(tagDraft)
      setTagDraft(emptyTag)
      setNotice(text.createdNotice(text.tag))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.createError(text.tag)))
    }
  }

  async function createBatchTaxonomies(kind: TaxonomyKind) {
    const result = kind === 'category' ? categoryBatchParsed : tagBatchParsed
    const label = kind === 'category' ? text.category : text.tag
    if (result.names.length === 0) {
      setNotice('')
      setError(text.emptyBatchError(label))
      return
    }

    setBatchBusy(kind)
    setNotice('')
    setError('')
    const failures: { name: string; message: string }[] = []
    let created = 0

    try {
      for (const name of result.names) {
        try {
          if (kind === 'category') {
            await api.createCategory({ name, slug: '', description: '', sortOrder: 0 })
          } else {
            await api.createTag({ name, slug: '' })
          }
          created += 1
        } catch (err) {
          failures.push({ name, message: apiErrorMessage(err, text.createFailure )})
        }
      }

      if (kind === 'category') {
        setCategoryBatch(failures.map((failure) => failure.name).join('\n'))
      } else {
        setTagBatch(failures.map((failure) => failure.name).join('\n'))
      }

      await load()
      if (failures.length > 0) {
        const detail = failures
          .slice(0, 3)
          .map((failure) => text.failureDetail(failure.name, failure.message))
          .join(text.failureSeparator)
        setError(text.batchFailure(created, label, failures.length, detail, failures.length > 3 ? text.moreFailures : ''))
      } else {
        setNotice(text.batchSuccess(created, label))
      }
    } finally {
      setBatchBusy(null)
    }
  }

  async function updateCategory(category: Category) {
    setNotice('')
    setError('')
    try {
      await api.updateCategory(category.id, category)
      setNotice(text.savedNotice(text.category))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.updateError(text.category)))
    }
  }

  async function updateTag(tag: Tag) {
    setNotice('')
    setError('')
    try {
      await api.updateTag(tag.id, tag)
      setNotice(text.savedNotice(text.tag))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.updateError(text.tag)))
    }
  }

  async function deleteCategory(category: Category) {
    const disabledReason = taxonomyDeleteDisabledReason(text.category, category, text.usage, adminLanguage)
    if (disabledReason) {
      setNotice('')
      setError(disabledReason)
      return
    }
    setNotice('')
    setError('')
    try {
      await api.deleteCategory(category.id)
      setNotice(text.deletedNotice(text.category))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.deleteError(text.category)))
    }
  }

  async function deleteTag(tag: Tag) {
    const disabledReason = taxonomyDeleteDisabledReason(text.tag, tag, text.usage, adminLanguage)
    if (disabledReason) {
      setNotice('')
      setError(disabledReason)
      return
    }
    setNotice('')
    setError('')
    try {
      await api.deleteTag(tag.id)
      setNotice(text.deletedNotice(text.tag))
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, text.deleteError(text.tag)))
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

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
        <Stack gap={2}>
          <Card>
            <CardContent>
              <Stack component="form" gap={2} onSubmit={createCategory}>
                <Typography variant="h6">{text.newCategory}</Typography>
                <TextField required label={text.name} value={categoryDraft.name} onChange={(event) => setCategoryDraft((value) => ({ ...value, name: event.target.value }))} />
                <TextField label={text.slug} value={categoryDraft.slug} onChange={(event) => setCategoryDraft((value) => ({ ...value, slug: event.target.value }))} />
                <TextField
                  label={text.description}
                  value={categoryDraft.description}
                  onChange={(event) => setCategoryDraft((value) => ({ ...value, description: event.target.value }))}
                  multiline
                  minRows={2}
                />
                <TextField
                  label={text.sortOrder}
                  type="number"
                  value={categoryDraft.sortOrder}
                  onChange={(event) => setCategoryDraft((value) => ({ ...value, sortOrder: Number(event.target.value) }))}
                />
                <Button type="submit" variant="contained" startIcon={<Plus size={18} />}>
                  {text.createCategory}
                </Button>
                <Divider />
                <Typography variant="subtitle1" fontWeight={900}>
                  {text.batchNewCategory}
                </Typography>
                <TextField
                  label={text.batchCategoryNames}
                  value={categoryBatch}
                  onChange={(event) => setCategoryBatch(event.target.value)}
                  multiline
                  minRows={4}
                  placeholder={text.categoryPlaceholder}
                  helperText={text.batchHelper(categoryBatchParsed, text.category)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ListPlus size={18} />}
                    onClick={() => void createBatchTaxonomies('category')}
                    disabled={categoryBatchParsed.names.length === 0 || batchActionBusy}
                  >
                    {text.batchCreateCategory}
                  </Button>
                  <Button type="button" variant="text" startIcon={<X size={18} />} onClick={() => setCategoryBatch('')} disabled={!categoryBatch || batchActionBusy}>
                    {text.clear}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{text.category}</TableCell>
                  <TableCell>{text.slug}</TableCell>
                  <TableCell>{text.relation}</TableCell>
                  <TableCell align="right">{text.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => {
                  const disabledReason = taxonomyDeleteDisabledReason(text.category, category, text.usage, adminLanguage)
                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={category.name}
                          onChange={(event) =>
                            setCategories((items) => items.map((item) => (item.id === category.id ? { ...item, name: event.target.value } : item)))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={category.slug}
                          onChange={(event) =>
                            setCategories((items) => items.map((item) => (item.id === category.id ? { ...item, slug: event.target.value } : item)))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={taxonomyUsageLabel(category, text.usage, adminLanguage)} color={category.referenceCount > 0 ? 'warning' : 'default'} />
                          <Chip size="small" label={text.publicCount(category.postCount)} variant="outlined" />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => void updateCategory(category)} aria-label={text.saveCategory}>
                          <Save size={18} />
                        </IconButton>
                        <Tooltip title={disabledReason || text.deleteCategory}>
                          <span>
                            <IconButton color="error" disabled={Boolean(disabledReason)} onClick={() => void deleteCategory(category)} aria-label={text.deleteCategory}>
                              <Trash2 size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </Stack>

        <Stack gap={2}>
          <Card>
            <CardContent>
              <Stack component="form" gap={2} onSubmit={createTag}>
                <Typography variant="h6">{text.newTag}</Typography>
                <TextField required label={text.name} value={tagDraft.name} onChange={(event) => setTagDraft((value) => ({ ...value, name: event.target.value }))} />
                <TextField label={text.slug} value={tagDraft.slug} onChange={(event) => setTagDraft((value) => ({ ...value, slug: event.target.value }))} />
                <Button type="submit" variant="contained" startIcon={<Plus size={18} />}>
                  {text.createTag}
                </Button>
                <Divider />
                <Typography variant="subtitle1" fontWeight={900}>
                  {text.batchNewTag}
                </Typography>
                <TextField
                  label={text.batchTagNames}
                  value={tagBatch}
                  onChange={(event) => setTagBatch(event.target.value)}
                  multiline
                  minRows={4}
                  placeholder={text.tagPlaceholder}
                  helperText={text.batchHelper(tagBatchParsed, text.tag)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ListPlus size={18} />}
                    onClick={() => void createBatchTaxonomies('tag')}
                    disabled={tagBatchParsed.names.length === 0 || batchActionBusy}
                  >
                    {text.batchCreateTag}
                  </Button>
                  <Button type="button" variant="text" startIcon={<X size={18} />} onClick={() => setTagBatch('')} disabled={!tagBatch || batchActionBusy}>
                    {text.clear}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{text.tag}</TableCell>
                  <TableCell>{text.slug}</TableCell>
                  <TableCell>{text.relation}</TableCell>
                  <TableCell align="right">{text.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tags.map((tag) => {
                  const disabledReason = taxonomyDeleteDisabledReason(text.tag, tag, text.usage, adminLanguage)
                  return (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={tag.name}
                          onChange={(event) => setTags((items) => items.map((item) => (item.id === tag.id ? { ...item, name: event.target.value } : item)))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={tag.slug}
                          onChange={(event) => setTags((items) => items.map((item) => (item.id === tag.id ? { ...item, slug: event.target.value } : item)))}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={taxonomyUsageLabel(tag, text.usage, adminLanguage)} color={tag.referenceCount > 0 ? 'warning' : 'default'} />
                          <Chip size="small" label={text.publicCount(tag.postCount)} variant="outlined" />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => void updateTag(tag)} aria-label={text.saveTag}>
                          <Save size={18} />
                        </IconButton>
                        <Tooltip title={disabledReason || text.deleteTag}>
                          <span>
                            <IconButton color="error" disabled={Boolean(disabledReason)} onClick={() => void deleteTag(tag)} aria-label={text.deleteTag}>
                              <Trash2 size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </Stack>
      </Box>
    </Stack>
  )
}
