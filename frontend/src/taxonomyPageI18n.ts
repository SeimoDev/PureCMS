import { TAXONOMY_BATCH_LIMIT } from './taxonomyBatch.js'
import type { TaxonomyBatchParseResult } from './taxonomyBatch.js'
import type { TaxonomyUsageMessages } from './taxonomyUsage.js'
import { normalizeLanguageCode } from './i18n.js'

export type TaxonomyPageUIText = {
  title: string
  subtitle: string
  loading: string
  loadError: string
  category: string
  tag: string
  createdNotice: (label: string) => string
  createError: (label: string) => string
  savedNotice: (label: string) => string
  updateError: (label: string) => string
  deletedNotice: (label: string) => string
  deleteError: (label: string) => string
  emptyBatchError: (label: string) => string
  createFailure: string
  moreFailures: string
  failureSeparator: string
  failureDetail: (name: string, message: string) => string
  batchFailure: (created: number, label: string, failures: number, detail: string, more: string) => string
  batchSuccess: (created: number, label: string) => string
  batchHelper: (result: TaxonomyBatchParseResult, label: string) => string
  name: string
  slug: string
  description: string
  sortOrder: string
  relation: string
  actions: string
  newCategory: string
  createCategory: string
  batchNewCategory: string
  batchCategoryNames: string
  categoryPlaceholder: string
  batchCreateCategory: string
  saveCategory: string
  deleteCategory: string
  newTag: string
  createTag: string
  batchNewTag: string
  batchTagNames: string
  tagPlaceholder: string
  batchCreateTag: string
  saveTag: string
  deleteTag: string
  clear: string
  publicCount: (count: number) => string
  usage: TaxonomyUsageMessages
  locale: string
}

const zhCN: TaxonomyPageUIText = {
  title: '分类标签',
  subtitle: '面向中文博客的信息架构和专题聚合',
  loading: '读取分类标签',
  loadError: '读取分类标签失败',
  category: '分类',
  tag: '标签',
  createdNotice: (label) => `${label}已创建。`,
  createError: (label) => `创建${label}失败`,
  savedNotice: (label) => `${label}已保存。`,
  updateError: (label) => `更新${label}失败`,
  deletedNotice: (label) => `${label}已删除。`,
  deleteError: (label) => `删除${label}失败`,
  emptyBatchError: (label) => `请先输入要批量创建的${label}名称`,
  createFailure: '创建失败',
  moreFailures: ' 等',
  failureSeparator: '、',
  failureDetail: (name, message) => `${name}：${message}`,
  batchFailure: (created, label, failures, detail, more) => `已创建 ${created} 个${label}，${failures} 个失败：${detail}${more}`,
  batchSuccess: (created, label) => `已批量创建 ${created} 个${label}。`,
  batchHelper: (result, label) => {
    const base = `已识别 ${result.names.length} 个${label}，单次最多 ${TAXONOMY_BATCH_LIMIT} 个`
    return result.overflow === 0 ? base : `${base}，另有 ${result.overflow} 个超出上限`
  },
  name: '名称',
  description: '描述',
  sortOrder: '排序',
  relation: '关联',
  actions: '操作',
  newCategory: '新建分类',
  createCategory: '新建分类',
  batchNewCategory: '批量新建分类',
  batchCategoryNames: '批量分类名称',
  categoryPlaceholder: '专题策划\n产品运营，AI 工具、出海增长',
  batchCreateCategory: '批量创建分类',
  saveCategory: '保存分类',
  deleteCategory: '删除分类',
  newTag: '新建标签',
  createTag: '新建标签',
  batchNewTag: '批量新建标签',
  batchTagNames: '批量标签名称',
  tagPlaceholder: 'React\nGo，PostgreSQL、Docker',
  batchCreateTag: '批量创建标签',
  saveTag: '保存标签',
  deleteTag: '删除标签',
  clear: '清空',
  publicCount: (count) => `公开 ${count}`,
  usage: {
    unused: '未关联内容',
    content: (count) => `${count} 篇内容`,
    deleteDisabled: (label, usage) => `该${label}仍关联 ${usage}，请先从文章中移除`,
  },
  slug: 'Slug',
  locale: 'zh-CN',
}

const en: TaxonomyPageUIText = {
  title: 'Taxonomy',
  subtitle: 'Manage blog information architecture and topic aggregation',
  loading: 'Loading taxonomy',
  loadError: 'Failed to load categories and tags',
  category: 'category',
  tag: 'tag',
  createdNotice: (label) => `${capitalize(label)} created.`,
  createError: (label) => `Failed to create ${label}`,
  savedNotice: (label) => `${capitalize(label)} saved.`,
  updateError: (label) => `Failed to update ${label}`,
  deletedNotice: (label) => `${capitalize(label)} deleted.`,
  deleteError: (label) => `Failed to delete ${label}`,
  emptyBatchError: (label) => `Enter ${label} names to create in bulk first`,
  createFailure: 'Create failed',
  moreFailures: ' and more',
  failureSeparator: '; ',
  failureDetail: (name, message) => `${name}: ${message}`,
  batchFailure: (created, label, failures, detail, more) => `Created ${created} ${label}s, ${failures} failed: ${detail}${more}`,
  batchSuccess: (created, label) => `Created ${created} ${label}s in bulk.`,
  batchHelper: (result, label) => {
    const base = `${result.names.length} ${label}s recognized, maximum ${TAXONOMY_BATCH_LIMIT} per run`
    return result.overflow === 0 ? base : `${base}, ${result.overflow} over the limit`
  },
  name: 'Name',
  slug: 'Slug',
  description: 'Description',
  sortOrder: 'Sort order',
  relation: 'Related',
  actions: 'Actions',
  newCategory: 'New category',
  createCategory: 'Create category',
  batchNewCategory: 'Bulk create categories',
  batchCategoryNames: 'Category names',
  categoryPlaceholder: 'Topics\nProduct ops, AI tools, global growth',
  batchCreateCategory: 'Create categories',
  saveCategory: 'Save category',
  deleteCategory: 'Delete category',
  newTag: 'New tag',
  createTag: 'Create tag',
  batchNewTag: 'Bulk create tags',
  batchTagNames: 'Tag names',
  tagPlaceholder: 'React\nGo, PostgreSQL, Docker',
  batchCreateTag: 'Create tags',
  saveTag: 'Save tag',
  deleteTag: 'Delete tag',
  clear: 'Clear',
  publicCount: (count) => `Public ${count}`,
  usage: {
    unused: 'No linked content',
    content: (count) => `${count} posts`,
    deleteDisabled: (label, usage) => `This ${label} still links to ${usage}. Remove it from posts first.`,
  },
  locale: 'en',
}

const zhTW: TaxonomyPageUIText = {
    ...zhCN,
    title: '分類標籤',
    subtitle: '面向中文部落格的資訊架構與專題聚合',
    loading: '讀取分類標籤',
    loadError: '讀取分類標籤失敗',
    category: '分類',
    tag: '標籤',
    emptyBatchError: (label) => `請先輸入要批次建立的${label}名稱`,
    createFailure: '建立失敗',
    batchNewCategory: '批次新建分類',
    batchCategoryNames: '批次分類名稱',
    batchCreateCategory: '批次建立分類',
    batchNewTag: '批次新建標籤',
    batchTagNames: '批次標籤名稱',
    batchCreateTag: '批次建立標籤',
    usage: {
      unused: '未關聯內容',
      content: (count) => `${count} 篇內容`,
      deleteDisabled: (label, usage) => `該${label}仍關聯 ${usage}，請先從文章中移除`,
    },
    locale: 'zh-TW',
}

const textByLanguage: Record<string, TaxonomyPageUIText> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja: makeVariant('分類タグ', 'カテゴリ', 'タグ', 'ja'),
  fr: makeVariant('Taxonomie', 'catégorie', 'étiquette', 'fr'),
  hi: makeVariant('वर्गीकरण', 'श्रेणी', 'टैग', 'hi'),
  es: makeVariant('Taxonomía', 'categoría', 'etiqueta', 'es'),
  ar: makeVariant('التصنيفات والوسوم', 'تصنيف', 'وسم', 'ar'),
  ru: makeVariant('Таксономия', 'категория', 'тег', 'ru'),
  pt: makeVariant('Taxonomia', 'categoria', 'tag', 'pt'),
  eo: makeVariant('Taksonomio', 'kategorio', 'etikedo', 'eo'),
}

function makeVariant(title: string, category: string, tag: string, locale: string): TaxonomyPageUIText {
  return {
    ...en,
    title,
    category,
    tag,
    newCategory: category,
    createCategory: category,
    batchNewCategory: `${category} batch`,
    batchCategoryNames: `${category} names`,
    batchCreateCategory: `${category} batch`,
    saveCategory: en.saveCategory,
    deleteCategory: en.deleteCategory,
    newTag: tag,
    createTag: tag,
    batchNewTag: `${tag} batch`,
    batchTagNames: `${tag} names`,
    batchCreateTag: `${tag} batch`,
    saveTag: en.saveTag,
    deleteTag: en.deleteTag,
    locale,
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function taxonomyPageUIText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return textByLanguage[code] ?? textByLanguage['zh-CN']
}
