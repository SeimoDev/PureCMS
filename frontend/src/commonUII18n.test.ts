import { commonUIText } from './commonUII18n.js'
import { formatDate, formatDateTime } from './components/format.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

function assertPresent(actual: string, message: string) {
  if (!actual.trim()) {
    throw new Error(`${message}: missing text`)
  }
}

const zh = commonUIText('zh-CN')
assertEqual(zh.loadingPage, '加载页面', 'simplified chinese route loading')
assertEqual(zh.emptyStateDescription, '当前没有可展示的数据。', 'simplified chinese empty state')
assertEqual(zh.cancel, '取消', 'simplified chinese cancel')
assertEqual(zh.confirm, '确认', 'simplified chinese confirm')
assertEqual(zh.postStatusLabels.published, '已发布', 'simplified chinese post status')
assertEqual(zh.commentStatusLabels.pending, '待审核', 'simplified chinese comment status')
assertEqual(formatDate(null, 'zh-CN'), '未发布', 'simplified chinese empty date')
assertEqual(formatDateTime(null, 'zh-CN'), '未设置', 'simplified chinese empty datetime')

const tw = commonUIText('zh-Hant')
assertEqual(tw.postStatusLabels.archived, '封存', 'traditional chinese matching')
assertEqual(formatDate(null, 'zh-Hant'), '未發布', 'traditional chinese empty date')

const en = commonUIText('en-US')
assertEqual(en.loadingPage, 'Loading page', 'english route loading')
assertEqual(en.destructiveAction, 'Destructive action', 'english destructive action')
assertEqual(en.commentStatusLabels.spam, 'Spam', 'english comment status')
assertEqual(formatDate(null, 'en-US'), 'Unpublished', 'english empty date')
assertEqual(formatDateTime(null, 'en-US'), 'Not set', 'english empty datetime')

assertEqual(commonUIText('ja').loading, '読み込み中', 'japanese loading')
assertEqual(commonUIText('fr').dateEmpty.notSet, 'Non défini', 'french date empty')
assertEqual(commonUIText('hi').postStatusLabels.draft, 'ड्राफ्ट', 'hindi draft')
assertEqual(commonUIText('es').emptyStateDescription, 'No hay datos para mostrar.', 'spanish empty state')
assertEqual(commonUIText('ar').commentStatusLabels.approved, 'مقبول', 'arabic approved')
assertEqual(commonUIText('ru').postStatusLabels.published, 'Опубликовано', 'russian published')
assertEqual(commonUIText('pt-BR').dateEmpty.unpublished, 'Não publicado', 'portuguese matching')
assertEqual(commonUIText('eo').loadingPage, 'Ŝargante paĝon', 'esperanto route loading')
assertEqual(commonUIText('unknown').loadingPage, '加载页面', 'unknown fallback')
assertEqual(formatDate(null, 'en', 'Never'), 'Never', 'explicit empty date label wins')

for (const language of ['zh-CN', 'zh-TW', 'en', 'ja', 'fr', 'hi', 'es', 'ar', 'ru', 'pt', 'eo']) {
  const text = commonUIText(language)
  assertPresent(text.cancel, `${language} cancel`)
  assertPresent(text.confirm, `${language} confirm`)
  assertPresent(text.destructiveAction, `${language} destructive action`)
}
