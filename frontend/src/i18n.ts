export const defaultLanguageCode = 'zh-CN'
export const languageStorageKey = 'purecms_language'

export type SupportedLanguage = {
  code: string
  flag: string
  nativeName: string
  rtl?: boolean
}

export const supportedLanguages: SupportedLanguage[] = [
  { code: 'zh-CN', flag: '🇨🇳', nativeName: '简体中文' },
  { code: 'zh-TW', flag: '🇹🇼', nativeName: '繁體中文' },
  { code: 'en', flag: '🇺🇸', nativeName: 'English' },
  { code: 'ja', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'fr', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'hi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'es', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'ar', flag: '🇸🇦', nativeName: 'العربية', rtl: true },
  { code: 'ru', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'pt', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'eo', flag: '🌍', nativeName: 'Esperanto' },
]

const languageMap = new Map(supportedLanguages.map((language) => [language.code, language]))

function matchLanguageCode(value?: string | null) {
  const normalized = (value ?? '').trim().replaceAll('_', '-').toLowerCase()
  if (!normalized) return null
  if (normalized === 'zh' || normalized.startsWith('zh-cn') || normalized.startsWith('zh-hans')) return 'zh-CN'
  if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.startsWith('zh-hant')) return 'zh-TW'
  for (const code of ['en', 'ja', 'fr', 'hi', 'es', 'ar', 'ru', 'pt', 'eo']) {
    if (normalized.startsWith(code)) return code
  }
  return null
}

export function normalizeLanguageCode(value?: string | null) {
  const matched = matchLanguageCode(value)
  if (matched) return matched
  return defaultLanguageCode
}

export function languageByCode(value?: string | null) {
  return languageMap.get(normalizeLanguageCode(value)) ?? supportedLanguages[0]
}

export function detectPreferredLanguage(languages: readonly string[] = []) {
  for (const language of languages) {
    const matched = matchLanguageCode(language)
    if (matched && languageMap.has(matched)) return matched
  }
  return defaultLanguageCode
}

export function preferredLanguageFromEnvironment(storage: Storage | null | undefined, languages: readonly string[] = []) {
  return detectPreferredLanguage([storage?.getItem(languageStorageKey) ?? '', ...languages])
}

export function languageOptionLabel(language: SupportedLanguage) {
  return `${language.flag} ${language.nativeName}`
}

export function isRtlLanguage(value?: string | null) {
  return Boolean(languageByCode(value).rtl)
}
