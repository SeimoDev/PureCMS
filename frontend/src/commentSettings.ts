import type { SiteSettings } from './types'

export const commentDefaults = {
  enabled: true,
  moderation: true,
  notice: '',
  spamKeywords: [] as string[],
  rateLimitWindowMinutes: 10,
  rateLimitMax: 5,
}

const maxWindowMinutes = 1440
const maxRateLimit = 100

export function normalizeCommentSettings(value: SiteSettings['comment'] | undefined) {
  return {
    enabled: value?.enabled ?? commentDefaults.enabled,
    moderation: value?.moderation ?? commentDefaults.moderation,
    notice: (value?.notice ?? '').trim(),
    spamKeywords: Array.isArray(value?.spamKeywords) ? value.spamKeywords : commentDefaults.spamKeywords,
    rateLimitWindowMinutes: boundedNumber(value?.rateLimitWindowMinutes, commentDefaults.rateLimitWindowMinutes, 1, maxWindowMinutes),
    rateLimitMax: boundedNumber(value?.rateLimitMax, commentDefaults.rateLimitMax, 1, maxRateLimit),
  }
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < min) return fallback
  return Math.min(max, Math.trunc(numeric))
}
