import { toAbsoluteUrl } from './url'

export type StructuredData = Record<string, unknown>

export type WebSiteStructuredDataInput = {
  name?: string
  description?: string
  url: string
  searchUrl?: string
}

export type BlogPostingStructuredDataInput = {
  title?: string
  description?: string
  url: string
  imageUrl?: string
  datePublished?: string | null
  dateModified?: string | null
  authorName?: string
  siteName?: string
  language?: string
  keywords?: string[]
}

export type WebPageStructuredDataInput = {
  title?: string
  description?: string
  url: string
  siteName?: string
  language?: string
  dateModified?: string | null
}

function clean(value?: string | null) {
  return value?.trim() ?? ''
}

function compactObject<T extends StructuredData>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null) return false
      if (typeof item === 'string') return item.trim().length > 0
      if (Array.isArray(item)) return item.length > 0
      return true
    }),
  ) as T
}

function keywordList(keywords?: string[]) {
  const seen = new Set<string>()
  return (keywords ?? [])
    .map(clean)
    .filter((keyword) => {
      if (!keyword || seen.has(keyword)) return false
      seen.add(keyword)
      return true
    })
    .join(',')
}

export function buildWebSiteStructuredData(input: WebSiteStructuredDataInput): StructuredData {
  const url = toAbsoluteUrl(input.url)
  const searchUrl = toAbsoluteUrl(input.searchUrl, url)
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: clean(input.name),
    description: clean(input.description),
    url,
    potentialAction: searchUrl
      ? {
          '@type': 'SearchAction',
          target: searchUrl,
          'query-input': 'required name=search_term_string',
        }
      : undefined,
  })
}

export function buildBlogPostingStructuredData(input: BlogPostingStructuredDataInput): StructuredData {
  const url = toAbsoluteUrl(input.url)
  const imageUrl = toAbsoluteUrl(input.imageUrl, url)
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: clean(input.title),
    description: clean(input.description),
    url,
    mainEntityOfPage: url
      ? {
          '@type': 'WebPage',
          '@id': url,
        }
      : undefined,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: clean(input.datePublished),
    dateModified: clean(input.dateModified) || clean(input.datePublished),
    inLanguage: clean(input.language),
    author: clean(input.authorName)
      ? {
          '@type': 'Person',
          name: clean(input.authorName),
        }
      : undefined,
    publisher: clean(input.siteName)
      ? {
          '@type': 'Organization',
          name: clean(input.siteName),
        }
      : undefined,
    keywords: keywordList(input.keywords),
  })
}

export function buildWebPageStructuredData(input: WebPageStructuredDataInput): StructuredData {
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: clean(input.title),
    description: clean(input.description),
    url: toAbsoluteUrl(input.url),
    dateModified: clean(input.dateModified),
    inLanguage: clean(input.language),
    isPartOf: clean(input.siteName)
      ? {
          '@type': 'WebSite',
          name: clean(input.siteName),
        }
      : undefined,
  })
}
