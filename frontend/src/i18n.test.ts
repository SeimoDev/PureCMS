import { detectPreferredLanguage, languageByCode, languageOptionLabel, normalizeLanguageCode } from './i18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(normalizeLanguageCode('zh-Hant-HK'), 'zh-TW', 'normalizes traditional Chinese')
assertEqual(normalizeLanguageCode('en-US'), 'en', 'normalizes English locale')
assertEqual(normalizeLanguageCode('unknown'), 'zh-CN', 'falls back to simplified Chinese')
assertEqual(detectPreferredLanguage(['de-DE', 'ja-JP']), 'ja', 'uses first supported browser language')
assertEqual(languageOptionLabel(languageByCode('es-MX')), '🇪🇸 Español', 'uses flag and native language name')
