import {
  hasPageDraftContent,
  hasPostDraftContent,
  pageDraftKey,
  pageInputsEqual,
  parsePageDraft,
  parsePostDraft,
  postDraftKey,
  postInputsEqual,
  serializePageDraft,
  serializePostDraft,
  shouldStorePageDraft,
  shouldStorePostDraft,
} from './editorDraft.js'
import type { PageInput, PostInput } from './types.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const empty: PostInput = {
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

const draft: PostInput = {
  ...empty,
  title: ' 本地草稿 ',
  content: '正文',
  tagIds: ['tag-1'],
}

assertEqual(postDraftKey(null), 'purecms_post_draft:new', 'new post draft key')
assertEqual(postDraftKey('post-1'), 'purecms_post_draft:post-1', 'existing post draft key')
assertEqual(String(hasPostDraftContent(empty)), 'false', 'empty post is not meaningful')
assertEqual(String(hasPostDraftContent(draft)), 'true', 'filled post is meaningful')
assertEqual(String(postInputsEqual(empty, { ...empty, categoryIds: [], tagIds: [] })), 'true', 'equal inputs')
assertEqual(String(postInputsEqual(empty, { ...empty, title: 'x' })), 'false', 'different title')
assertEqual(String(shouldStorePostDraft(draft, empty)), 'true', 'changed meaningful draft should store')
assertEqual(String(shouldStorePostDraft(empty, empty)), 'false', 'unchanged empty draft should not store')
assertEqual(String(shouldStorePostDraft({ ...empty, title: '  ' }, empty)), 'false', 'whitespace only draft should not store')
assertEqual(String(shouldStorePostDraft({ ...empty, sourceLanguage: 'en' }, empty)), 'true', 'source language change should store')

const savedAt = '2026-06-01T10:45:00.000Z'
const parsed = parsePostDraft(serializePostDraft(draft, savedAt))
assertEqual(parsed?.savedAt ?? '', savedAt, 'serialized draft savedAt')
assertEqual(parsed?.form.title ?? '', draft.title, 'serialized draft form')
assertEqual(parsed?.form.sourceLanguage ?? '', 'zh-CN', 'serialized draft source language')
assertEqual(String(parsePostDraft('{broken json')), 'null', 'broken draft is ignored')
assertEqual(String(parsePostDraft(JSON.stringify({ savedAt, form: { title: 'missing fields' } }))), 'null', 'invalid form is ignored')

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

const pageDraft: PageInput = {
  ...emptyPage,
  title: '关于我',
  content: '页面正文',
  showInNav: true,
}

assertEqual(pageDraftKey(null), 'purecms_page_draft:new', 'new page draft key')
assertEqual(pageDraftKey('page-1'), 'purecms_page_draft:page-1', 'existing page draft key')
assertEqual(String(hasPageDraftContent(emptyPage)), 'false', 'empty page is not meaningful')
assertEqual(String(hasPageDraftContent(pageDraft)), 'true', 'filled page is meaningful')
assertEqual(String(hasPageDraftContent({ ...emptyPage, sortOrder: 2 })), 'true', 'sort order is meaningful')
assertEqual(String(pageInputsEqual(emptyPage, { ...emptyPage })), 'true', 'equal page inputs')
assertEqual(String(pageInputsEqual(emptyPage, { ...emptyPage, navLabel: '关于' })), 'false', 'different page nav label')
assertEqual(String(shouldStorePageDraft(pageDraft, emptyPage)), 'true', 'changed page draft should store')
assertEqual(String(shouldStorePageDraft({ ...emptyPage, title: '  ' }, emptyPage)), 'false', 'whitespace only page draft should not store')

const parsedPage = parsePageDraft(serializePageDraft(pageDraft, savedAt))
assertEqual(parsedPage?.savedAt ?? '', savedAt, 'serialized page draft savedAt')
assertEqual(parsedPage?.form.title ?? '', pageDraft.title, 'serialized page draft form')
assertEqual(String(parsePageDraft('{broken json')), 'null', 'broken page draft is ignored')
assertEqual(String(parsePageDraft(JSON.stringify({ savedAt, form: { title: 'missing fields' } }))), 'null', 'invalid page form is ignored')
