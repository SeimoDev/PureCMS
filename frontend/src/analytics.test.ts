import { analyticsUIText, formatAnalyticsDay } from './analytics.js'
import { supportedLanguages } from './i18n.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

for (const language of supportedLanguages) {
  const text = analyticsUIText(language.code)
  if (
    !text.title ||
    !text.loading ||
    !text.metrics.totalViews ||
    !text.metrics.todayViews ||
    !text.metrics.days ||
    !text.dailyTrend ||
    !text.popularPosts ||
    !text.empty
  ) {
    throw new Error(`missing analytics UI text for ${language.code}`)
  }
  if (!text.dayOption(14).includes('14') || !text.recentDays(7).includes('7') || !text.totalViewsChip('28K').includes('28K')) {
    throw new Error(`analytics counters should preserve numbers for ${language.code}`)
  }
}

assertEqual(analyticsUIText('en').title, 'Analytics', 'English title')
assertEqual(analyticsUIText('en').dayOption(30), '30 days', 'English day option')
assertEqual(analyticsUIText('pt-BR').title, 'Análises', 'Portuguese browser locale fallback')
assertEqual(analyticsUIText('ar').popularPosts, 'المقالات الشائعة', 'Arabic popular posts')
assertEqual(formatAnalyticsDay('2026-06-02', 'en'), '06/02', 'English day format')
assertEqual(formatAnalyticsDay('2026-06-02', 'zh-CN'), '06/02', 'Chinese day format')
