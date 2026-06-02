import type { Page } from './types'

export type PageStatusFilterValue = '' | Page['status']
export type PageNavFilterValue = '' | 'shown' | 'hidden'

export const pageStatusOptions: Array<{ value: PageStatusFilterValue; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '归档' },
]

export const pageNavOptions: Array<{ value: PageNavFilterValue; label: string }> = [
  { value: '', label: '全部导航' },
  { value: 'shown', label: '显示在导航' },
  { value: 'hidden', label: '未显示' },
]

export function pageStatusLabel(status: string) {
  if (status === 'published') return '已发布'
  if (status === 'draft') return '草稿'
  if (status === 'archived') return '归档'
  return '未知状态'
}

export function pageNavLabel(nav: string) {
  if (nav === 'shown') return '显示在导航'
  if (nav === 'hidden') return '未显示'
  return '全部导航'
}
