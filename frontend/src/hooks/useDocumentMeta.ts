import { useEffect } from 'react'
import { applyDocumentMeta, buildDocumentMeta, type DocumentMetaInput } from '../documentMeta'

export function useDocumentMeta({
  siteTitle,
  siteDescription,
  siteKeywords,
  title,
  description,
  keywords,
  socialType,
  canonicalUrl,
  imageUrl,
  feedUrl,
  languageCode,
  verifications,
  structuredData,
  alternateLanguages,
}: DocumentMetaInput) {
  const keywordList = keywords?.join('\n') ?? ''
  const verificationFingerprint = JSON.stringify(verifications ?? {})
  const structuredDataFingerprint = JSON.stringify(structuredData ?? [])
  const alternateLanguagesFingerprint = JSON.stringify(alternateLanguages ?? [])

  useEffect(() => {
    applyDocumentMeta(
      buildDocumentMeta({
        siteTitle,
        siteDescription,
        siteKeywords,
        title,
        description,
        keywords: keywordList ? keywordList.split('\n') : undefined,
        socialType,
        canonicalUrl: canonicalUrl ?? window.location.href,
        imageUrl,
        feedUrl: feedUrl ?? `${window.location.origin}/rss.xml`,
        baseUrl: window.location.href,
        languageCode,
        verifications: JSON.parse(verificationFingerprint),
        structuredData: JSON.parse(structuredDataFingerprint),
        alternateLanguages: JSON.parse(alternateLanguagesFingerprint),
      }),
    )
  }, [
    alternateLanguagesFingerprint,
    canonicalUrl,
    description,
    feedUrl,
    imageUrl,
    keywordList,
    languageCode,
    siteDescription,
    siteKeywords,
    siteTitle,
    socialType,
    structuredDataFingerprint,
    title,
    verificationFingerprint,
  ])
}
