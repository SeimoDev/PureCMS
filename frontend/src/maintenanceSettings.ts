import type { SiteSettings } from './types'

export const maintenanceDefaults = {
  enabled: false,
  message: '',
}

export function normalizeMaintenanceSettings(value: SiteSettings['maintenance'] | undefined) {
  return {
    enabled: Boolean(value?.enabled ?? maintenanceDefaults.enabled),
    message: (value?.message ?? maintenanceDefaults.message).trim(),
  }
}
