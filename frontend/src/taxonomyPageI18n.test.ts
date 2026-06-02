import { taxonomyPageUIText } from './taxonomyPageI18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(taxonomyPageUIText('zh-CN').title, '分类标签', 'zh-CN title')
assertEqual(taxonomyPageUIText('zh-CN').failureSeparator, '、', 'zh-CN failure separator')
assertEqual(taxonomyPageUIText('zh-TW').category, '分類', 'zh-TW category')
assertEqual(taxonomyPageUIText('en').batchHelper({ names: ['a', 'b'], overflow: 1 }, 'tag'), '2 tags recognized, maximum 50 per run, 1 over the limit', 'en batch helper')
assertEqual(taxonomyPageUIText('en').failureSeparator, '; ', 'en failure separator')
assertEqual(taxonomyPageUIText('ja').title, '分類タグ', 'ja title')
assertEqual(taxonomyPageUIText('fr').category, 'catégorie', 'fr category')
assertEqual(taxonomyPageUIText('hi').category, 'श्रेणी', 'hi category')
assertEqual(taxonomyPageUIText('es').tag, 'etiqueta', 'es tag')
assertEqual(taxonomyPageUIText('ar').title, 'التصنيفات والوسوم', 'ar title')
assertEqual(taxonomyPageUIText('ru').tag, 'тег', 'ru tag')
assertEqual(taxonomyPageUIText('pt-BR').title, 'Taxonomia', 'pt normalized')
assertEqual(taxonomyPageUIText('eo').category, 'kategorio', 'eo category')
assertEqual(taxonomyPageUIText('unknown').title, '分类标签', 'fallback title')
