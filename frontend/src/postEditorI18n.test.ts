import { formatPostDraftSavedAt, postEditorUIText } from './postEditorI18n.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const zh = postEditorUIText('zh-CN')
assertEqual(zh.editTitle, '编辑文章', 'simplified chinese edit title')
assertEqual(zh.sourceLanguageHelper.includes('文章发布后后台会按内置语言自动翻译并缓存'), true, 'publish-time translation helper')
assertEqual(zh.toolbar.bold, '加粗', 'simplified chinese toolbar label')
assertEqual(zh.toolbar.tableTemplate.includes('列名'), true, 'simplified chinese toolbar table template')
assertEqual(zh.selectionSeparator, '、', 'simplified chinese selection separator')
assertEqual(formatPostDraftSavedAt('not-a-date', zh), '刚刚', 'invalid draft time fallback')

const tw = postEditorUIText('zh-Hant')
assertEqual(tw.editTitle, '編輯文章', 'traditional chinese matching')
assertEqual(tw.save, '儲存', 'traditional chinese save label')

const en = postEditorUIText('en-US')
assertEqual(en.editTitle, 'Edit Post', 'english matching')
assertEqual(en.sourceLanguageHelper.includes('backend automatically translates'), true, 'english publish-time translation helper')
assertEqual(en.toolbar.code, 'Code block', 'english toolbar label')
assertEqual(en.toolbar.tableTemplate.includes('Column'), true, 'english toolbar table template')
assertEqual(en.toolbar.boldPlaceholder, 'Important text', 'english toolbar bold placeholder')
assertEqual(en.selectionSeparator, ', ', 'english selection separator')

assertEqual(postEditorUIText('ja').newTitle, '新規投稿', 'japanese variant')
assertEqual(postEditorUIText('fr').save, 'Enregistrer', 'french variant')
assertEqual(postEditorUIText('hi').close, 'बंद करें', 'hindi variant')
assertEqual(postEditorUIText('es').preview, 'Vista previa', 'spanish variant')
assertEqual(postEditorUIText('ar').editTitle, 'تحرير المقالة', 'arabic variant')
assertEqual(postEditorUIText('ru').save, 'Сохранить', 'russian variant')
assertEqual(postEditorUIText('pt-BR').save, 'Salvar', 'portuguese matching')
assertEqual(postEditorUIText('eo').newTitle, 'Nova afiŝo', 'esperanto variant')
assertEqual(postEditorUIText('unknown').editTitle, '编辑文章', 'unknown fallback')

const enTime = formatPostDraftSavedAt('2026-06-01T12:34:00Z', en)
assertEqual(typeof enTime, 'string', 'formatted draft time type')
assertEqual(enTime.length > 0, true, 'formatted draft time content')
