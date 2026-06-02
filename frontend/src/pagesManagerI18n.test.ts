import { supportedLanguages } from './i18n.js'
import { pagesManagerUIText } from './pagesManagerI18n.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const simplifiedFragments = ['页面', '状态', '导航', '搜索', '回收站', '草稿', '发布', '操作', '版本']

for (const language of supportedLanguages) {
  const text = pagesManagerUIText(language.code)
  if (
    !text.title ||
    !text.newPage ||
    !text.filterPlaceholder ||
    !text.bulkTitle ||
    !text.statusLabel ||
    !text.navLabel ||
    !text.statusLabels.published ||
    !text.statusLabels.draft ||
    !text.statusLabels.archived ||
    !text.revisionsTitle
  ) {
    throw new Error(`missing pages manager UI text for ${language.code}`)
  }

  if (language.code !== 'zh-CN' && language.code !== 'zh-TW') {
    const core = [
      text.title,
      text.newPage,
      text.statusLabel,
      text.navLabel,
      text.search,
      text.clear,
      text.trash,
      text.bulkTitle,
      text.statusLabels.published,
      text.statusLabels.draft,
      text.statusLabels.archived,
      text.revisionsTitle,
    ].join(' ')
    for (const fragment of simplifiedFragments) {
      if (core.includes(fragment)) {
        throw new Error(`pages manager ${language.code} leaked Simplified Chinese fragment ${fragment}: ${core}`)
      }
    }
  }
}

assertEqual(pagesManagerUIText('en').title, 'Pages', 'English title')
assertEqual(pagesManagerUIText('ar').title, 'الصفحات', 'Arabic title')
assertEqual(pagesManagerUIText('pt-BR').newPage, 'Nova página', 'Portuguese locale fallback')
assertEqual(pagesManagerUIText('zh-Hant').statusLabels.archived, '封存', 'Traditional Chinese locale fallback')
assertEqual(pagesManagerUIText('ja').title, 'ページ管理', 'Japanese title')
