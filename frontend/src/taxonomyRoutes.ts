import type { Category, Tag } from './types'
import { publicPageUIText, publicUIText } from './uiI18n'

export type TaxonomyKind = 'category' | 'tag'
export type TaxonomyItem = Category | Tag

export function taxonomyPath(kind: TaxonomyKind, slug: string) {
  return `/${kind === 'category' ? 'categories' : 'tags'}/${slug}`
}

export function findTaxonomyItem(kind: TaxonomyKind, slug: string, categories: Category[], tags: Tag[]) {
  return kind === 'category' ? categories.find((category) => category.slug === slug) : tags.find((tag) => tag.slug === slug)
}

export function taxonomyTitle(kind: TaxonomyKind, item?: TaxonomyItem, languageCode?: string | null) {
  const appText = publicUIText(languageCode)
  const pageText = publicPageUIText(languageCode)
  if (!item) {
    return kind === 'category' ? pageText.taxonomy.categoryEyebrow : pageText.taxonomy.tagEyebrow
  }
  return kind === 'category' ? appText.home.categoryTitle(item.name) : appText.home.tagTitle(item.name)
}

export function taxonomyDescription(kind: TaxonomyKind, item?: TaxonomyItem, languageCode?: string | null) {
  const appText = publicUIText(languageCode)
  const pageText = publicPageUIText(languageCode)
  if (!item) {
    return pageText.taxonomy.empty
  }
  if ('description' in item && item.description.trim()) {
    return item.description.trim()
  }
  return kind === 'category' ? appText.home.categoryDescription(item.name) : appText.home.tagDescription(item.name)
}
