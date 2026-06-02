import { normalizeTranslationSettings } from './translationSettings.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const defaults = normalizeTranslationSettings(undefined)
assertEqual(defaults.provider, 'openai-compatible', 'default provider')
assertEqual(String(defaults.enabled), 'false', 'disabled by default')

const normalized = normalizeTranslationSettings({ enabled: true, provider: ' custom ', endpoint: '', model: ' gpt-x ', timeoutSeconds: 999 })
assertEqual(String(normalized.enabled), 'true', 'enabled flag')
assertEqual(normalized.provider, 'custom', 'trims provider')
assertEqual(normalized.endpoint, 'https://api.openai.com/v1/chat/completions', 'empty endpoint falls back')
assertEqual(normalized.model, 'gpt-x', 'trims model')
assertEqual(String(normalized.timeoutSeconds), '120', 'clamps timeout')
