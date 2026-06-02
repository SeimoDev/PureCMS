import type { ArchiveYear } from './types'

export function monthName(month: number) {
  if (month < 1 || month > 12) return '未知月份'
  return `${month}月`
}

export function archiveTotalPosts(archives: ArchiveYear[]) {
  return archives.reduce((total, year) => total + year.postCount, 0)
}
