import { friendLinkDisplayHost, friendLinkInitial } from './publicFriendLinks.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(friendLinkDisplayHost('https://blog.example.com/path?from=home'), 'blog.example.com', 'extracts hostname')
assertEqual(friendLinkDisplayHost('example.com/notes'), 'example.com', 'adds scheme before parsing host')
assertEqual(friendLinkDisplayHost('  '), '', 'empty url has empty host')
assertEqual(friendLinkDisplayHost('mailto:hello@example.com'), 'hello@example.com', 'mailto uses address')

assertEqual(friendLinkInitial('茶馆日志'), '茶', 'uses first Chinese character')
assertEqual(friendLinkInitial('  PureCMS  '), 'P', 'trims and uppercases latin initial')
assertEqual(friendLinkInitial(''), '友', 'empty name uses fallback')
assertEqual(friendLinkInitial('', 'L'), 'L', 'empty name uses localized fallback')
