import { friendLinksPageUIText } from './friendLinksPageI18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(friendLinksPageUIText('zh-CN').title, '友情链接', 'zh-CN title')
assertEqual(friendLinksPageUIText('zh-CN').failureSeparator, '、', 'zh-CN failure separator')
assertEqual(friendLinksPageUIText('zh-TW').statusLabels.hidden, '隱藏', 'zh-TW hidden')
assertEqual(friendLinksPageUIText('en').bulkSelected(2, 5), '2 selected, 5 filtered', 'en bulk selected')
assertEqual(friendLinksPageUIText('en').failureSeparator, '; ', 'en failure separator')
assertEqual(friendLinksPageUIText('ja').title, 'リンク', 'ja title')
assertEqual(friendLinksPageUIText('fr').statusLabels.hidden, 'Masqué', 'fr hidden')
assertEqual(friendLinksPageUIText('hi').title, 'मित्र लिंक', 'hi title')
assertEqual(friendLinksPageUIText('es').statusLabels.active, 'Público', 'es active')
assertEqual(friendLinksPageUIText('ar').title, 'روابط الأصدقاء', 'ar title')
assertEqual(friendLinksPageUIText('ru').statusLabels.hidden, 'Скрыто', 'ru hidden')
assertEqual(friendLinksPageUIText('pt-BR').title, 'Links amigos', 'pt normalized')
assertEqual(friendLinksPageUIText('eo').statusLabels.active, 'Publika', 'eo active')
assertEqual(friendLinksPageUIText('unknown').title, '友情链接', 'fallback title')
