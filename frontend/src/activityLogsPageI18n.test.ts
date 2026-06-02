import { activityLogsPageUIText } from './activityLogsPageI18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(activityLogsPageUIText('zh-CN').title, '操作日志', 'zh-CN title')
assertEqual(activityLogsPageUIText('zh-TW').allActions, '全部動作', 'zh-TW all actions')
assertEqual(activityLogsPageUIText('en').search, 'Search', 'en search')
assertEqual(activityLogsPageUIText('ja').systemActor, 'システム', 'ja system actor')
assertEqual(activityLogsPageUIText('fr').unknownSource, 'Source inconnue', 'fr unknown source')
assertEqual(activityLogsPageUIText('hi').actionLabel, 'क्रिया', 'hi action label')
assertEqual(activityLogsPageUIText('es').entityTypeLabel, 'Objeto', 'es entity label')
assertEqual(activityLogsPageUIText('ar').search, 'بحث', 'ar search')
assertEqual(activityLogsPageUIText('ru').allEntityTypes, 'Все объекты', 'ru all objects')
assertEqual(activityLogsPageUIText('pt').loadError, 'Falha ao carregar logs de atividade', 'pt load error')
assertEqual(activityLogsPageUIText('eo').emptyTitle, 'Neniuj aktivecaj protokoloj', 'eo empty title')
assertEqual(activityLogsPageUIText('unknown').title, '操作日志', 'unknown fallback')
assertEqual(activityLogsPageUIText('en-US').paginationSummary(3, 1, 2), '3 logs, page 1 / 2', 'normalized en-US summary')
