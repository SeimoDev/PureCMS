import { toAbsoluteUrl } from './url.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(toAbsoluteUrl(' https://cdn.example.cn/a.jpg '), 'https://cdn.example.cn/a.jpg', 'absolute URL is trimmed')
assertEqual(toAbsoluteUrl('/uploads/cover.jpg', 'https://blog.example.cn/posts/hello'), 'https://blog.example.cn/uploads/cover.jpg', 'root relative URL')
assertEqual(toAbsoluteUrl('cover.jpg?size=large#top', 'https://blog.example.cn/posts/hello'), 'https://blog.example.cn/posts/cover.jpg?size=large#top', 'path relative URL')
assertEqual(toAbsoluteUrl('/uploads/cover.jpg'), '/uploads/cover.jpg', 'relative URL without base is preserved')
assertEqual(toAbsoluteUrl('   '), '', 'blank URL is empty')
