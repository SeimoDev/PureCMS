import type { FriendLink } from './types'

export type FriendLinkStatusFilter = 'all' | FriendLink['status']

type FilterableFriendLink = Pick<FriendLink, 'description' | 'name' | 'status' | 'url'>

export function filterFriendLinks<T extends FilterableFriendLink>(links: T[], query: string, status: FriendLinkStatusFilter) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return links.filter((link) => {
    if (status !== 'all' && link.status !== status) return false
    if (!normalizedQuery) return true
    return [link.name, link.url, link.description].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  })
}

export function countFriendLinksByStatus(links: FilterableFriendLink[]) {
  return links.reduce(
    (counts, link) => ({
      total: counts.total + 1,
      active: counts.active + (link.status === 'active' ? 1 : 0),
      hidden: counts.hidden + (link.status === 'hidden' ? 1 : 0),
    }),
    { total: 0, active: 0, hidden: 0 },
  )
}
