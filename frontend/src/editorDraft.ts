import type { PageInput, PostInput } from './types'

export type PostDraftSnapshot = {
  form: PostInput
  savedAt: string
}

export type PageDraftSnapshot = {
  form: PageInput
  savedAt: string
}

const POST_DRAFT_PREFIX = 'purecms_post_draft'
const PAGE_DRAFT_PREFIX = 'purecms_page_draft'

export function postDraftKey(postId?: string | null) {
  return `${POST_DRAFT_PREFIX}:${postId?.trim() || 'new'}`
}

export function pageDraftKey(pageId?: string | null) {
  return `${PAGE_DRAFT_PREFIX}:${pageId?.trim() || 'new'}`
}

function postTextFields(form: PostInput) {
  return [form.title, form.slug, form.excerpt, form.content, form.coverUrl, form.seoTitle, form.seoDescription]
}

export function hasPostDraftContent(form: PostInput) {
  return (
    postTextFields(form).some((value) => value.trim() !== '') ||
    form.status !== 'draft' ||
    form.sourceLanguage !== 'zh-CN' ||
    form.featured ||
    Boolean(form.publishedAt) ||
    form.categoryIds.length > 0 ||
    form.tagIds.length > 0
  )
}

function pageTextFields(form: PageInput) {
  return [form.title, form.slug, form.content, form.navLabel, form.seoTitle, form.seoDescription]
}

export function hasPageDraftContent(form: PageInput) {
  return (
    pageTextFields(form).some((value) => value.trim() !== '') ||
    form.status !== 'draft' ||
    form.showInNav ||
    form.sortOrder !== 0
  )
}

function normalizePostInput(form: PostInput) {
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    sourceLanguage: form.sourceLanguage,
    coverUrl: form.coverUrl,
    status: form.status,
    featured: form.featured,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    categoryIds: [...form.categoryIds],
    tagIds: [...form.tagIds],
    publishedAt: form.publishedAt ?? null,
  }
}

export function postInputsEqual(left: PostInput, right: PostInput) {
  return JSON.stringify(normalizePostInput(left)) === JSON.stringify(normalizePostInput(right))
}

export function shouldStorePostDraft(form: PostInput, baseForm: PostInput) {
  return hasPostDraftContent(form) && !postInputsEqual(form, baseForm)
}

function normalizePageInput(form: PageInput) {
  return {
    title: form.title,
    slug: form.slug,
    content: form.content,
    status: form.status,
    showInNav: form.showInNav,
    navLabel: form.navLabel,
    sortOrder: form.sortOrder,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
  }
}

export function pageInputsEqual(left: PageInput, right: PageInput) {
  return JSON.stringify(normalizePageInput(left)) === JSON.stringify(normalizePageInput(right))
}

export function shouldStorePageDraft(form: PageInput, baseForm: PageInput) {
  return hasPageDraftContent(form) && !pageInputsEqual(form, baseForm)
}

function isPostStatus(value: unknown): value is PostInput['status'] {
  return value === 'draft' || value === 'published' || value === 'archived'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parsePostForm(value: unknown): PostInput | null {
  if (!value || typeof value !== 'object') return null
  const form = value as Record<string, unknown>
  if (
    typeof form.title !== 'string' ||
    typeof form.slug !== 'string' ||
    typeof form.excerpt !== 'string' ||
    typeof form.content !== 'string' ||
    !(typeof form.sourceLanguage === 'string' || form.sourceLanguage === undefined) ||
    typeof form.coverUrl !== 'string' ||
    !isPostStatus(form.status) ||
    typeof form.featured !== 'boolean' ||
    typeof form.seoTitle !== 'string' ||
    typeof form.seoDescription !== 'string' ||
    !isStringArray(form.categoryIds) ||
    !isStringArray(form.tagIds) ||
    !(typeof form.publishedAt === 'string' || form.publishedAt === null || form.publishedAt === undefined)
  ) {
    return null
  }
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    sourceLanguage: form.sourceLanguage ?? 'zh-CN',
    coverUrl: form.coverUrl,
    status: form.status,
    featured: form.featured,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    categoryIds: form.categoryIds,
    tagIds: form.tagIds,
    publishedAt: form.publishedAt ?? null,
  }
}

function parsePageForm(value: unknown): PageInput | null {
  if (!value || typeof value !== 'object') return null
  const form = value as Record<string, unknown>
  if (
    typeof form.title !== 'string' ||
    typeof form.slug !== 'string' ||
    typeof form.content !== 'string' ||
    !isPostStatus(form.status) ||
    typeof form.showInNav !== 'boolean' ||
    typeof form.navLabel !== 'string' ||
    typeof form.sortOrder !== 'number' ||
    typeof form.seoTitle !== 'string' ||
    typeof form.seoDescription !== 'string'
  ) {
    return null
  }
  return {
    title: form.title,
    slug: form.slug,
    content: form.content,
    status: form.status,
    showInNav: form.showInNav,
    navLabel: form.navLabel,
    sortOrder: form.sortOrder,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
  }
}

export function serializePostDraft(form: PostInput, savedAt = new Date().toISOString()) {
  return JSON.stringify({ form: normalizePostInput(form), savedAt })
}

export function serializePageDraft(form: PageInput, savedAt = new Date().toISOString()) {
  return JSON.stringify({ form: normalizePageInput(form), savedAt })
}

export function parsePostDraft(value: string | null): PostDraftSnapshot | null {
  if (!value) return null
  try {
    const payload = JSON.parse(value) as Record<string, unknown>
    if (!payload || typeof payload.savedAt !== 'string') return null
    const form = parsePostForm(payload.form)
    if (!form) return null
    return { form, savedAt: payload.savedAt }
  } catch {
    return null
  }
}

export function parsePageDraft(value: string | null): PageDraftSnapshot | null {
  if (!value) return null
  try {
    const payload = JSON.parse(value) as Record<string, unknown>
    if (!payload || typeof payload.savedAt !== 'string') return null
    const form = parsePageForm(payload.form)
    if (!form) return null
    return { form, savedAt: payload.savedAt }
  } catch {
    return null
  }
}
