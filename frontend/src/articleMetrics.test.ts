import {
  articleMetricText,
  articleReadingStats,
  countReadableTextUnits,
  formatReadingMinutes,
  formatTextUnitCount,
  markdownToReadableText,
} from './articleMetrics.js'
import { supportedLanguages } from './i18n.js'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const plain = markdownToReadableText('## 标题\n\n你好世界 React Go 2026')
assertEqual(plain.includes('##'), false, 'heading marker stripped')
assertEqual(countReadableTextUnits(plain), 9, 'counts CJK characters and latin words')

const markdown = markdownToReadableText('![封面图](https://example.com/cover.png)\n[官网链接](https://example.com)\n`const x = 1`')
assertEqual(markdown.includes('https://example.com'), false, 'urls stripped from readable text')
assertEqual(countReadableTextUnits(markdown), 10, 'keeps visible alt, link and code text')

const shortStats = articleReadingStats('你好世界')
assertEqual(shortStats.textUnits, 4, 'short text units')
assertEqual(shortStats.readingMinutes, 1, 'non-empty text has minimum one minute')

const emptyStats = articleReadingStats('   \n\n')
assertEqual(emptyStats.textUnits, 0, 'empty text units')
assertEqual(emptyStats.readingMinutes, 0, 'empty text minutes')

assertEqual(formatTextUnitCount(998), '约 998 字', 'formats small text unit count')
assertEqual(formatTextUnitCount(12800), '约 1.3 万字', 'formats large text unit count')
assertEqual(formatReadingMinutes(0), '少于 1 分钟阅读', 'formats zero minute reading')
assertEqual(formatReadingMinutes(6), '6 分钟阅读', 'formats reading minutes')

const enMetrics = articleMetricText('en-US')
assertEqual(formatTextUnitCount(12800, enMetrics), 'About 13K words', 'formats english large text unit count')
assertEqual(formatReadingMinutes(6, enMetrics), '6 min read', 'formats english reading minutes')

const zhTWMetrics = articleMetricText('zh-Hant')
assertEqual(formatTextUnitCount(12800, zhTWMetrics), '約 1.3 萬字', 'formats traditional chinese large text unit count')
assertEqual(formatReadingMinutes(0, zhTWMetrics), '少於 1 分鐘閱讀', 'formats traditional chinese zero minute reading')

for (const language of supportedLanguages) {
  const text = articleMetricText(language.code)
  if (!formatTextUnitCount(12800, text) || !formatReadingMinutes(6, text)) {
    throw new Error(`missing article metric text for ${language.code}`)
  }
  if (language.code !== 'en' && formatTextUnitCount(12800, text).includes('About')) {
    throw new Error(`article metric text leaked English word-count copy for ${language.code}`)
  }
}

assertEqual(formatTextUnitCount(12800, articleMetricText('ja')), '約 1.3 万文字', 'formats japanese large text unit count')
assertEqual(formatTextUnitCount(12800, articleMetricText('fr')).includes('mots'), true, 'formats french word unit')
assertEqual(formatTextUnitCount(12800, articleMetricText('hi')).includes('शब्द'), true, 'formats hindi word unit')
assertEqual(formatTextUnitCount(12800, articleMetricText('ar')).includes('كلمة'), true, 'formats arabic word unit')

assertEqual(articleMetricText('unknown').locale, 'zh-CN', 'unknown metric language falls back')
