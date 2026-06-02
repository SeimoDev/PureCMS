import { countFriendLinksByStatus, filterFriendLinks } from './friendLinkFilters.js'

type TestLink = {
  name: string
  url: string
  description: string
  status: 'active' | 'hidden'
}

const links: TestLink[] = [
  { name: '独立博客', url: 'https://blog.example.com', description: '长期阅读', status: 'active' },
  { name: '项目主页', url: 'https://project.example.com', description: '开源工具', status: 'hidden' },
  { name: '设计资源站', url: 'https://design.example.com', description: 'Material Design 参考', status: 'active' },
]

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

function assertArray(actual: string[], expected: string[], label: string) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label)
}

assertArray(
  filterFriendLinks(links, '博客', 'all').map((link) => link.name),
  ['独立博客'],
  'filters by Chinese name',
)

assertArray(
  filterFriendLinks(links, 'PROJECT', 'all').map((link) => link.name),
  ['项目主页'],
  'filters URL case-insensitively',
)

assertArray(
  filterFriendLinks(links, '工具', 'hidden').map((link) => link.name),
  ['项目主页'],
  'combines query and hidden status',
)

assertArray(
  filterFriendLinks(links, '', 'active').map((link) => link.name),
  ['独立博客', '设计资源站'],
  'filters active links',
)

const counts = countFriendLinksByStatus(links)
assertEqual(String(counts.total), '3', 'counts total links')
assertEqual(String(counts.active), '2', 'counts active links')
assertEqual(String(counts.hidden), '1', 'counts hidden links')
