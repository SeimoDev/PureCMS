import { pageNavLabel, pageNavOptions, pageStatusLabel, pageStatusOptions } from './pagesFilter.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(pageStatusLabel('published'), '已发布', 'published status label')
assertEqual(pageStatusLabel('draft'), '草稿', 'draft status label')
assertEqual(pageStatusLabel('archived'), '归档', 'archived status label')
assertEqual(pageStatusLabel('unknown'), '未知状态', 'unknown status label')
assertEqual(pageNavLabel('shown'), '显示在导航', 'shown nav label')
assertEqual(pageNavLabel('hidden'), '未显示', 'hidden nav label')

assertEqual(pageStatusOptions.map((option) => option.value).join(','), ',published,draft,archived', 'status option order')
assertEqual(pageNavOptions.map((option) => option.value).join(','), ',shown,hidden', 'nav option order')
