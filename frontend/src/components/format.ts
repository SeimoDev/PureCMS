import { commonUIText } from '../commonUII18n.js'
import { normalizeLanguageCode } from '../i18n.js'

function localeFor(languageCode?: string | null) {
  return normalizeLanguageCode(languageCode)
}

export function formatDate(value?: string | null, languageCode?: string | null, emptyLabel?: string) {
  if (!value) return emptyLabel ?? commonUIText(languageCode).dateEmpty.unpublished
  return new Intl.DateTimeFormat(localeFor(languageCode), { dateStyle: 'medium' }).format(new Date(value))
}

export function formatDateTime(value?: string | null, languageCode?: string | null, emptyLabel?: string) {
  if (!value) return emptyLabel ?? commonUIText(languageCode).dateEmpty.notSet
  return new Intl.DateTimeFormat(localeFor(languageCode), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function compactNumber(value: number, languageCode?: string | null) {
  return new Intl.NumberFormat(localeFor(languageCode), { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
