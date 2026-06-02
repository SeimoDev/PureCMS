import { normalizeLanguageCode } from './i18n'
import { toAbsoluteUrl } from './url'

export type DocumentMetaInput = {
  siteTitle?: string
  siteDescription?: string
  siteKeywords?: string
  title?: string
  description?: string
  keywords?: string[]
  socialType?: 'website' | 'article'
  canonicalUrl?: string
  imageUrl?: string
  feedUrl?: string
  baseUrl?: string
  languageCode?: string
  verifications?: WebmasterVerifications
  structuredData?: StructuredDataInput | StructuredDataInput[]
  alternateLanguages?: AlternateLanguageLinkInput[]
}

export type AlternateLanguageLinkInput = {
  hreflang: string
  href: string
}

export const webmasterVerificationKeys = ['baidu', 'google', 'bing', 'so360', 'sogou'] as const

export type WebmasterVerificationKey = (typeof webmasterVerificationKeys)[number]

export type WebmasterVerifications = Partial<Record<WebmasterVerificationKey, string>>

export type StructuredDataInput = Record<string, unknown>

export const webmasterVerificationMetaNames: Record<WebmasterVerificationKey, string> = {
  baidu: 'baidu-site-verification',
  google: 'google-site-verification',
  bing: 'msvalidate.01',
  so360: '360-site-verification',
  sogou: 'sogou_site_verification',
}

export type DocumentMeta = {
  title: string
  description: string
  keywords: string
  socialType: 'website' | 'article'
  siteName: string
  canonicalUrl: string
  imageUrl: string
  feedUrl: string
  twitterCard: 'summary' | 'summary_large_image'
  verifications: Record<WebmasterVerificationKey, string>
  structuredData: StructuredDataInput[]
  alternateLanguages: AlternateLanguageLinkInput[]
}

const defaultSiteTitleByLanguage: Record<string, string> = {
  'zh-CN': '个人博客',
  'zh-TW': '個人部落格',
  en: 'Personal Blog',
  ja: '個人ブログ',
  fr: 'Blog personnel',
  hi: 'व्यक्तिगत ब्लॉग',
  es: 'Blog personal',
  ar: 'مدونة شخصية',
  ru: 'Личный блог',
  pt: 'Blog pessoal',
  eo: 'Persona blogo',
}

const defaultDescriptionByLanguage: Record<string, string> = {
  'zh-CN': '记录技术、生活和长期思考',
  'zh-TW': '記錄技術、生活與長期思考',
  en: 'Notes on technology, life, and long-term thinking',
  ja: '技術、暮らし、長期的な思考の記録',
  fr: 'Notes sur la technologie, la vie et la réflexion à long terme',
  hi: 'तकनीक, जीवन और दीर्घकालिक सोच पर नोट्स',
  es: 'Notas sobre tecnología, vida y pensamiento a largo plazo',
  ar: 'ملاحظات عن التقنية والحياة والتفكير طويل المدى',
  ru: 'Заметки о технологиях, жизни и долгосрочном мышлении',
  pt: 'Notas sobre tecnologia, vida e pensamento de longo prazo',
  eo: 'Notoj pri teknologio, vivo kaj longtempa pensado',
}

function defaultSiteTitle(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return defaultSiteTitleByLanguage[code] ?? defaultSiteTitleByLanguage['zh-CN']
}

function defaultDescription(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return defaultDescriptionByLanguage[code] ?? defaultDescriptionByLanguage['zh-CN']
}

function clean(value?: string | null) {
  return value?.trim() ?? ''
}

function splitKeywords(value?: string) {
  return clean(value)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueKeywords(items: string[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item)) return false
    seen.add(item)
    return true
  })
}

function cleanVerifications(input?: WebmasterVerifications): Record<WebmasterVerificationKey, string> {
  return webmasterVerificationKeys.reduce(
    (values, key) => {
      values[key] = clean(input?.[key])
      return values
    },
    {} as Record<WebmasterVerificationKey, string>,
  )
}

export function buildDocumentMeta(input: DocumentMetaInput): DocumentMeta {
  const siteTitle = clean(input.siteTitle) || defaultSiteTitle(input.languageCode)
  const pageTitle = clean(input.title)
  const description = clean(input.description) || clean(input.siteDescription) || defaultDescription(input.languageCode)
  const keywords = uniqueKeywords([...splitKeywords(input.siteKeywords), ...(input.keywords ?? []).map(clean).filter(Boolean)])
  const canonicalUrl = toAbsoluteUrl(input.canonicalUrl, input.baseUrl)
  const imageUrl = toAbsoluteUrl(input.imageUrl, canonicalUrl || input.baseUrl)
  const feedUrl = toAbsoluteUrl(input.feedUrl, canonicalUrl || input.baseUrl)
  const alternateLanguages = normalizeAlternateLanguages(input.alternateLanguages, canonicalUrl || input.baseUrl)

  return {
    title: pageTitle ? `${pageTitle} - ${siteTitle}` : siteTitle,
    description,
    keywords: keywords.join(','),
    socialType: input.socialType ?? (pageTitle ? 'article' : 'website'),
    siteName: siteTitle,
    canonicalUrl,
    imageUrl,
    feedUrl,
    twitterCard: imageUrl ? 'summary_large_image' : 'summary',
    verifications: cleanVerifications(input.verifications),
    structuredData: normalizeStructuredData(input.structuredData),
    alternateLanguages,
  }
}

function normalizeAlternateLanguages(input: AlternateLanguageLinkInput[] | undefined, baseUrl?: string) {
  if (!input) return []
  const seen = new Set<string>()
  return input
    .map((item) => ({
      hreflang: clean(item.hreflang),
      href: toAbsoluteUrl(item.href, baseUrl),
    }))
    .filter((item) => {
      if (!item.hreflang || !item.href || seen.has(item.hreflang)) return false
      seen.add(item.hreflang)
      return true
    })
}

function normalizeStructuredData(input?: StructuredDataInput | StructuredDataInput[]): StructuredDataInput[] {
  if (!input) return []
  const values = Array.isArray(input) ? input : [input]
  return values.filter((value) => value && typeof value === 'object')
}

export function serializeStructuredData(values: StructuredDataInput[]) {
  return JSON.stringify(values).replace(/</g, '\\u003c')
}

function upsertMeta(documentRef: Document, selector: string, attributes: Record<string, string>, content: string) {
  let element = documentRef.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = documentRef.createElement('meta')
    Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value))
    documentRef.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function removeMeta(documentRef: Document, selector: string) {
  documentRef.head.querySelector<HTMLMetaElement>(selector)?.remove()
}

function upsertLink(documentRef: Document, selector: string, attributes: Record<string, string>) {
  let element = documentRef.head.querySelector<HTMLLinkElement>(selector)
  if (!element) {
    element = documentRef.createElement('link')
    documentRef.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value))
}

function applyStructuredData(documentRef: Document, values: StructuredDataInput[]) {
  documentRef.head.querySelector<HTMLScriptElement>('script[data-purecms-structured-data="true"]')?.remove()
  if (values.length === 0) return
  const element = documentRef.createElement('script')
  element.type = 'application/ld+json'
  element.dataset.gptCmsStructuredData = 'true'
  element.textContent = serializeStructuredData(values)
  documentRef.head.appendChild(element)
}

function applyAlternateLanguages(documentRef: Document, values: AlternateLanguageLinkInput[]) {
  documentRef.head.querySelectorAll<HTMLLinkElement>('link[data-purecms-alternate-language="true"]').forEach((element) => element.remove())
  for (const value of values) {
    const element = documentRef.createElement('link')
    element.rel = 'alternate'
    element.hreflang = value.hreflang
    element.href = value.href
    element.dataset.gptCmsAlternateLanguage = 'true'
    documentRef.head.appendChild(element)
  }
}

export function applyDocumentMeta(meta: DocumentMeta, documentRef: Document = document) {
  documentRef.title = meta.title
  upsertMeta(documentRef, 'meta[name="description"]', { name: 'description' }, meta.description)
  upsertMeta(documentRef, 'meta[property="og:title"]', { property: 'og:title' }, meta.title)
  upsertMeta(documentRef, 'meta[property="og:description"]', { property: 'og:description' }, meta.description)
  upsertMeta(documentRef, 'meta[property="og:type"]', { property: 'og:type' }, meta.socialType)
  upsertMeta(documentRef, 'meta[property="og:site_name"]', { property: 'og:site_name' }, meta.siteName)
  upsertMeta(documentRef, 'meta[name="twitter:card"]', { name: 'twitter:card' }, meta.twitterCard)
  upsertMeta(documentRef, 'meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title)
  upsertMeta(documentRef, 'meta[name="twitter:description"]', { name: 'twitter:description' }, meta.description)
  upsertMeta(documentRef, 'meta[name="keywords"]', { name: 'keywords' }, meta.keywords)
  if (meta.canonicalUrl) {
    upsertLink(documentRef, 'link[rel="canonical"]', { rel: 'canonical', href: meta.canonicalUrl })
    upsertMeta(documentRef, 'meta[property="og:url"]', { property: 'og:url' }, meta.canonicalUrl)
  } else {
    documentRef.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove()
    removeMeta(documentRef, 'meta[property="og:url"]')
  }
  if (meta.feedUrl) {
    upsertLink(documentRef, 'link[rel="alternate"][type="application/rss+xml"]', {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: `${meta.siteName} RSS`,
      href: meta.feedUrl,
    })
  } else {
    documentRef.head.querySelector<HTMLLinkElement>('link[rel="alternate"][type="application/rss+xml"]')?.remove()
  }
  if (meta.imageUrl) {
    upsertMeta(documentRef, 'meta[property="og:image"]', { property: 'og:image' }, meta.imageUrl)
    upsertMeta(documentRef, 'meta[name="twitter:image"]', { name: 'twitter:image' }, meta.imageUrl)
  } else {
    removeMeta(documentRef, 'meta[property="og:image"]')
    removeMeta(documentRef, 'meta[name="twitter:image"]')
  }
  for (const key of webmasterVerificationKeys) {
    const metaName = webmasterVerificationMetaNames[key]
    const selector = `meta[name="${metaName}"]`
    const content = meta.verifications[key]
    if (content) {
      upsertMeta(documentRef, selector, { name: metaName }, content)
    } else {
      removeMeta(documentRef, selector)
    }
  }
  applyAlternateLanguages(documentRef, meta.alternateLanguages)
  applyStructuredData(documentRef, meta.structuredData)
}
