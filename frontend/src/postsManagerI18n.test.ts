import { supportedLanguages } from './i18n.js'
import { postsManagerUIText } from './postsManagerI18n.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const simplifiedFragments = ['文章', '分类', '标签', '状态', '操作', '搜索', '回收站', '浏览', '评论', '站长']

for (const language of supportedLanguages) {
  const text = postsManagerUIText(language.code)
  if (
    !text.title ||
    !text.newPost ||
    !text.searchPlaceholder ||
    !text.bulkTitle ||
    !text.tableActions ||
    !text.statusLabels.published ||
    !text.statusLabels.draft ||
    !text.statusLabels.archived ||
    !text.meta.views ||
    !text.meta.comments
  ) {
    throw new Error(`missing posts manager UI text for ${language.code}`)
  }

  if (language.code !== 'zh-CN' && language.code !== 'zh-TW') {
    const core = [
      text.title,
      text.newPost,
      text.statusLabel,
      text.categoryLabel,
      text.tagLabel,
      text.tableActions,
      text.search,
      text.clear,
      text.statusLabels.published,
      text.meta.views,
      text.meta.comments,
    ].join(' ')
    for (const fragment of simplifiedFragments) {
      if (core.includes(fragment)) {
        throw new Error(`posts manager ${language.code} leaked Simplified Chinese fragment ${fragment}: ${core}`)
      }
    }
  }
}

assertEqual(postsManagerUIText('en').title, 'Posts', 'English title')
assertEqual(postsManagerUIText('ar').title, 'المقالات', 'Arabic title')
assertEqual(postsManagerUIText('pt-BR').newPost, 'Novo post', 'Portuguese locale fallback')
assertEqual(postsManagerUIText('zh-Hant').statusLabels.archived, '封存', 'Traditional Chinese locale fallback')
