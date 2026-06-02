import { archiveTotalPosts, monthName } from './archives.js'
import type { ArchiveYear } from './types.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(monthName(1), '1月', 'January label')
assertEqual(monthName(12), '12月', 'December label')
assertEqual(monthName(0), '未知月份', 'invalid month label')

const archives: ArchiveYear[] = [
  { year: 2026, postCount: 2, months: [] },
  { year: 2025, postCount: 3, months: [] },
]

assertEqual(archiveTotalPosts(archives), 5, 'total archive posts')
