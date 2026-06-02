import { commentDefaults, normalizeCommentSettings } from './commentSettings.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const defaults = normalizeCommentSettings(undefined)
assertEqual(defaults.enabled, true, 'default enabled')
assertEqual(defaults.moderation, true, 'default moderation')
assertEqual(defaults.rateLimitWindowMinutes, commentDefaults.rateLimitWindowMinutes, 'default window')
assertEqual(defaults.rateLimitMax, commentDefaults.rateLimitMax, 'default max')

const normalized = normalizeCommentSettings({
  enabled: false,
  moderation: false,
  notice: '  请理性交流  ',
  spamKeywords: ['广告', '推广'],
  rateLimitWindowMinutes: 9000,
  rateLimitMax: 2000,
})

assertEqual(normalized.enabled, false, 'explicit enabled')
assertEqual(normalized.moderation, false, 'explicit moderation')
assertEqual(normalized.notice, '请理性交流', 'trim notice')
assertEqual(normalized.rateLimitWindowMinutes, 1440, 'window cap')
assertEqual(normalized.rateLimitMax, 100, 'max cap')
