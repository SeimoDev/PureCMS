const cjkCharacterPattern = /[\u3400-\u9fff\uf900-\ufaff]/g
const latinWordPattern = /[A-Za-z0-9]+(?:[._'-][A-Za-z0-9]+)*/g

export type ArticleReadingStats = {
  textUnits: number
  readingMinutes: number
}

export type ArticleMetricText = {
  textUnitCount: (textUnits: number) => string
  largeTextUnitCount: (value: string) => string
  readingLessThanOneMinute: string
  readingMinutes: (minutes: number) => string
  locale?: string
}

const defaultArticleMetricText: ArticleMetricText = {
  textUnitCount: (textUnits) => `约 ${textUnits} 字`,
  largeTextUnitCount: (value) => `约 ${value} 万字`,
  readingLessThanOneMinute: '少于 1 分钟阅读',
  readingMinutes: (minutes) => `${minutes} 分钟阅读`,
  locale: 'zh-CN',
}

const englishArticleMetricText: ArticleMetricText = {
  textUnitCount: (textUnits) => `About ${new Intl.NumberFormat('en').format(textUnits)} words`,
  largeTextUnitCount: (value) => `About ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) * 10000)} words`,
  readingLessThanOneMinute: 'Less than 1 min read',
  readingMinutes: (minutes) => `${minutes} min read`,
  locale: 'en',
}

function wordMetricText(locale: string, unit: string, prefix: string): Pick<ArticleMetricText, 'textUnitCount' | 'largeTextUnitCount'> {
  const number = new Intl.NumberFormat(locale)
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  return {
    textUnitCount: (textUnits) => `${prefix} ${number.format(textUnits)} ${unit}`,
    largeTextUnitCount: (value) => `${prefix} ${compact.format(Number(value) * 10000)} ${unit}`,
  }
}

const articleMetricTextByLanguage: Record<string, ArticleMetricText> = {
  'zh-CN': defaultArticleMetricText,
  'zh-TW': {
    textUnitCount: (textUnits) => `約 ${textUnits} 字`,
    largeTextUnitCount: (value) => `約 ${value} 萬字`,
    readingLessThanOneMinute: '少於 1 分鐘閱讀',
    readingMinutes: (minutes) => `${minutes} 分鐘閱讀`,
    locale: 'zh-TW',
  },
  en: englishArticleMetricText,
  ja: {
    textUnitCount: (textUnits) => `約 ${new Intl.NumberFormat('ja').format(textUnits)} 文字`,
    largeTextUnitCount: (value) => `約 ${value} 万文字`,
    readingLessThanOneMinute: '1分未満で読めます',
    readingMinutes: (minutes) => `${minutes}分で読めます`,
    locale: 'ja',
  },
  fr: {
    ...wordMetricText('fr', 'mots', 'Environ'),
    readingLessThanOneMinute: 'Moins de 1 min de lecture',
    readingMinutes: (minutes) => `${minutes} min de lecture`,
    locale: 'fr',
  },
  hi: {
    ...wordMetricText('hi', 'शब्द', 'लगभग'),
    readingLessThanOneMinute: '1 मिनट से कम पढ़ाई',
    readingMinutes: (minutes) => `${minutes} मिनट पढ़ाई`,
    locale: 'hi',
  },
  es: {
    ...wordMetricText('es', 'palabras', 'Aprox.'),
    readingLessThanOneMinute: 'Menos de 1 min de lectura',
    readingMinutes: (minutes) => `${minutes} min de lectura`,
    locale: 'es',
  },
  ar: {
    ...wordMetricText('ar', 'كلمة', 'حوالي'),
    readingLessThanOneMinute: 'أقل من دقيقة قراءة',
    readingMinutes: (minutes) => `${minutes} دقائق قراءة`,
    locale: 'ar',
  },
  ru: {
    ...wordMetricText('ru', 'слов', 'Около'),
    readingLessThanOneMinute: 'Меньше 1 мин чтения',
    readingMinutes: (minutes) => `${minutes} мин чтения`,
    locale: 'ru',
  },
  pt: {
    ...wordMetricText('pt', 'palavras', 'Cerca de'),
    readingLessThanOneMinute: 'Menos de 1 min de leitura',
    readingMinutes: (minutes) => `${minutes} min de leitura`,
    locale: 'pt',
  },
  eo: {
    ...wordMetricText('eo', 'vortoj', 'Ĉirkaŭ'),
    readingLessThanOneMinute: 'Malpli ol 1 min legado',
    readingMinutes: (minutes) => `${minutes} min legado`,
    locale: 'eo',
  },
}

function normalizeMetricLanguageCode(value?: string | null) {
  const normalized = (value ?? '').trim().replaceAll('_', '-').toLowerCase()
  if (!normalized) return 'zh-CN'
  if (normalized === 'zh' || normalized.startsWith('zh-cn') || normalized.startsWith('zh-hans')) return 'zh-CN'
  if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.startsWith('zh-hant')) return 'zh-TW'
  for (const code of ['en', 'ja', 'fr', 'hi', 'es', 'ar', 'ru', 'pt', 'eo']) {
    if (normalized.startsWith(code)) return code
  }
  return 'zh-CN'
}

export function articleMetricText(languageCode?: string | null) {
  return articleMetricTextByLanguage[normalizeMetricLanguageCode(languageCode)] ?? defaultArticleMetricText
}

export function markdownToReadableText(content: string) {
  return content
    .replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)\n?```/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')
    .replace(/`([^`]+)`/g, ' $1 ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*(?:[-*]|\d+[.)])\s+/gm, '')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '')
    .replace(/[*_~>#|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countReadableTextUnits(text: string) {
  const cjkCount = text.match(cjkCharacterPattern)?.length ?? 0
  const withoutCjk = text.replace(cjkCharacterPattern, ' ')
  const latinWordCount = withoutCjk.match(latinWordPattern)?.length ?? 0
  return cjkCount + latinWordCount
}

export function articleReadingStats(content: string): ArticleReadingStats {
  const textUnits = countReadableTextUnits(markdownToReadableText(content))
  return {
    textUnits,
    readingMinutes: textUnits === 0 ? 0 : Math.max(1, Math.ceil(textUnits / 500)),
  }
}

export function formatTextUnitCount(textUnits: number, text: ArticleMetricText = defaultArticleMetricText) {
  if (textUnits >= 10000) {
    const value = textUnits / 10000
    return text.largeTextUnitCount(value.toFixed(value >= 10 ? 0 : 1))
  }
  return text.textUnitCount(textUnits)
}

export function formatReadingMinutes(minutes: number, text: ArticleMetricText = defaultArticleMetricText) {
  return minutes <= 0 ? text.readingLessThanOneMinute : text.readingMinutes(minutes)
}
