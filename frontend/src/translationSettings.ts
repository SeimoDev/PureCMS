import type { SiteSettings } from './types'

export const translationDefaults = {
  enabled: false,
  provider: 'openai-compatible',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: '',
  timeoutSeconds: 30,
}

export function normalizeTranslationSettings(value: SiteSettings['translation'] | undefined) {
  const timeout = Number(value?.timeoutSeconds ?? translationDefaults.timeoutSeconds)
  return {
    enabled: Boolean(value?.enabled ?? translationDefaults.enabled),
    provider: value?.provider?.trim() || translationDefaults.provider,
    endpoint: value?.endpoint?.trim() || translationDefaults.endpoint,
    model: value?.model?.trim() || translationDefaults.model,
    apiKey: value?.apiKey ?? translationDefaults.apiKey,
    timeoutSeconds: Number.isFinite(timeout) ? Math.min(120, Math.max(5, Math.trunc(timeout))) : translationDefaults.timeoutSeconds,
  }
}
