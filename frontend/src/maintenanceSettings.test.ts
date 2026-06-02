import { maintenanceDefaults, normalizeMaintenanceSettings } from './maintenanceSettings.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const defaults = normalizeMaintenanceSettings(undefined)
assertEqual(defaults.enabled, maintenanceDefaults.enabled, 'default enabled')
assertEqual(defaults.message, maintenanceDefaults.message, 'default message')

const normalized = normalizeMaintenanceSettings({ enabled: true, message: '  upgrading  ' })
assertEqual(normalized.enabled, true, 'enabled preserved')
assertEqual(normalized.message, 'upgrading', 'message trimmed')
