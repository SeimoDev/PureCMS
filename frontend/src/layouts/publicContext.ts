import { useOutletContext } from 'react-router-dom'
import type { Category, FriendLink, Page, SiteSettings, Tag } from '../types'

export type PublicContext = {
  settings: SiteSettings
  categories: Category[]
  tags: Tag[]
  friendLinks: FriendLink[]
  pages: Page[]
  selectedLanguage: string
  setSelectedLanguage: (value: string) => void
}

export function usePublicData() {
  return useOutletContext<PublicContext>()
}
