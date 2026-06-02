import { formatReadingMinutes, formatTextUnitCount } from './articleMetrics.js'
import { contentPreviewUIText } from './contentPreviewI18n.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const zh = contentPreviewUIText('zh-CN')
assertEqual(zh.previewBadge, '后台预览', 'simplified chinese preview badge')
assertEqual(zh.statusLabels.published, '已发布', 'simplified chinese published status')
assertEqual(formatTextUnitCount(998, zh.metrics), '约 998 字', 'simplified chinese text units')
assertEqual(formatReadingMinutes(0, zh.metrics), '少于 1 分钟阅读', 'simplified chinese zero reading')

const tw = contentPreviewUIText('zh-Hant')
assertEqual(tw.statusLabels.archived, '封存', 'traditional chinese matching')
assertEqual(formatTextUnitCount(12800, tw.metrics), '約 1.3 萬字', 'traditional chinese large text units')

const en = contentPreviewUIText('en-US')
assertEqual(en.previewBadge, 'Admin preview', 'english matching')
assertEqual(en.statusLabels.draft, 'Draft', 'english draft status')
assertEqual(formatTextUnitCount(12800, en.metrics), 'About 13K words', 'english large text units')
assertEqual(formatReadingMinutes(6, en.metrics), '6 min read', 'english reading minutes')

assertEqual(contentPreviewUIText('ja').backToEdit, '編集に戻る', 'japanese variant')
assertEqual(contentPreviewUIText('fr').publicPage, 'Page publique', 'french variant')
assertEqual(contentPreviewUIText('hi').previewBadge, 'एडमिन पूर्वावलोकन', 'hindi variant')
assertEqual(contentPreviewUIText('es').customPage, 'Página personalizada', 'spanish variant')
assertEqual(contentPreviewUIText('ar').statusLabels.archived, 'مؤرشف', 'arabic variant')
assertEqual(contentPreviewUIText('ru').statusLabels.published, 'Опубликовано', 'russian variant')
assertEqual(contentPreviewUIText('pt-BR').backToEdit, 'Voltar para edição', 'portuguese matching')
assertEqual(contentPreviewUIText('eo').publicPage, 'Publika paĝo', 'esperanto variant')
assertEqual(contentPreviewUIText('unknown').previewBadge, '后台预览', 'unknown fallback')
