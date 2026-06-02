import { backupPageUIText } from './backupPageI18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(backupPageUIText('zh-CN').title, '备份导入导出', 'zh-CN title')
assertEqual(backupPageUIText('zh-TW').exportButton, '匯出 JSON 備份', 'zh-TW export')
assertEqual(backupPageUIText('en').importTitle, 'Import', 'en import')
assertEqual(backupPageUIText('ja').record.users, 'ユーザー', 'ja users')
assertEqual(backupPageUIText('fr').record.activityLogs, 'Journaux', 'fr logs')
assertEqual(backupPageUIText('hi').exportError, 'निर्यात विफल', 'hi export error')
assertEqual(backupPageUIText('es').importResultTitle, 'Resultado de importación', 'es import result')
assertEqual(backupPageUIText('ar').importTitle, 'استيراد', 'ar import')
assertEqual(backupPageUIText('ru').mediaFiles(2, 3), 'Медиа 2/3', 'ru media files')
assertEqual(backupPageUIText('pt-BR').importButton, 'Escolher JSON e importar', 'pt-BR normalized')
assertEqual(backupPageUIText('eo').embeddedMedia('1 KB', 2), 'Enmetita aŭdvida enhavo 1 KB, 2 eroj havas nur metadatumojn', 'eo embedded media')
assertEqual(backupPageUIText('unknown').title, '备份导入导出', 'fallback title')
