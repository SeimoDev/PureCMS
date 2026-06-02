import { mediaPageUIText } from './mediaPageI18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(mediaPageUIText('zh-CN').title, '媒体库', 'zh-CN title')
assertEqual(mediaPageUIText('zh-TW').kindLabels.text, '文字', 'zh-TW text kind')
assertEqual(mediaPageUIText('en').search, 'Search', 'en search')
assertEqual(mediaPageUIText('ja').deleteMedia, 'メディアを削除', 'ja delete media')
assertEqual(mediaPageUIText('fr').copyUrl, 'Copier URL', 'fr copy URL')
assertEqual(mediaPageUIText('hi').chooseFile, 'फाइल चुनें', 'hi choose file')
assertEqual(mediaPageUIText('es').emptyFiltered, 'No hay multimedia coincidente', 'es empty filtered')
assertEqual(mediaPageUIText('ar').kindLabels.other, 'مرفق', 'ar attachment')
assertEqual(mediaPageUIText('ru').paginationSummary(10, 1, 2), '10 файлов, страница 1 / 2', 'ru pagination')
assertEqual(mediaPageUIText('pt-BR').upload, 'Enviar', 'pt-BR normalized')
assertEqual(mediaPageUIText('eo').usage.unused, 'Neuzata', 'eo unused')
assertEqual(mediaPageUIText('unknown').title, '媒体库', 'fallback title')
