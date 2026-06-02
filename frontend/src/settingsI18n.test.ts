import { supportedLanguages } from './i18n.js'
import { appearanceAccentOptions } from './appearance.js'
import { settingsUIText } from './settingsI18n.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const simplifiedFragments = ['站点设置', '保存设置', '读取站点', '允许公开评论', '搜索摘要', '发布后自动翻译', 'ICP备案']

for (const language of supportedLanguages) {
  const text = settingsUIText(language.code)
  if (
    !text.title ||
    !text.save ||
    !text.siteProfile ||
    !text.translationTitle ||
    !text.translationDescription ||
    !text.seoTitle ||
    !text.appearanceTitle ||
    !text.commentTitle ||
    !text.accentLabels['#256B57']
  ) {
    throw new Error(`missing settings UI text for ${language.code}`)
  }
  for (const option of appearanceAccentOptions) {
    if (!text.accentLabels[option.value]) {
      throw new Error(`missing accent label ${option.value} for ${language.code}`)
    }
  }

  if (language.code !== 'zh-CN' && language.code !== 'zh-TW') {
    const core = [
      text.title,
      text.save,
      text.siteProfile,
      text.translationTitle,
      text.translationEnabled,
      text.seoTitle,
      text.appearanceTitle,
      text.commentTitle,
      text.commentsEnabled,
    ].join(' ')
    for (const fragment of simplifiedFragments) {
      if (core.includes(fragment)) {
        throw new Error(`settings ${language.code} leaked Simplified Chinese fragment ${fragment}: ${core}`)
      }
    }
  }
}

assertEqual(settingsUIText('en').title, 'Site Settings', 'English title')
assertEqual(settingsUIText('en').icpUrl, 'ICP filing URL', 'English ICP URL label')
assertEqual(settingsUIText('ja').translationEnabled, '公開後に自動翻訳を有効化', 'Japanese publish translation label')
assertEqual(settingsUIText('ar').title, 'إعدادات الموقع', 'Arabic title')
assertEqual(settingsUIText('pt-BR').save, 'Salvar configurações', 'Portuguese locale fallback')
assertEqual(settingsUIText('pt-BR').policeRecordUrl, 'URL do registro de segurança pública', 'Portuguese police record URL label')
assertEqual(settingsUIText('zh-Hant').save, '儲存設定', 'Traditional Chinese locale fallback')
assertEqual(settingsUIText('zh-Hant').icpUrl, 'ICP 備案連結', 'Traditional Chinese ICP URL label')
