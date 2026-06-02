import { appearanceDefaults, normalizeAppearanceSettings } from './appearance.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const defaults = normalizeAppearanceSettings(undefined)
assertEqual(defaults.themeMode, appearanceDefaults.themeMode, 'default mode')
assertEqual(defaults.accentColor, appearanceDefaults.accentColor, 'default accent')
assertEqual(defaults.homeLayout, appearanceDefaults.homeLayout, 'default home layout')
assertEqual(defaults.coverStyle, appearanceDefaults.coverStyle, 'default cover style')

const normalized = normalizeAppearanceSettings({
  themeMode: 'dark',
  accentColor: '#B3261E',
  homeLayout: 'list',
  coverStyle: 'plain',
})

assertEqual(normalized.themeMode, 'dark', 'explicit mode')
assertEqual(normalized.accentColor, '#B3261E', 'explicit accent')
assertEqual(normalized.homeLayout, 'list', 'explicit layout')
assertEqual(normalized.coverStyle, 'plain', 'explicit cover')

const clamped = normalizeAppearanceSettings({
  themeMode: 'solarized',
  accentColor: '#000000',
  homeLayout: 'masonry',
  coverStyle: 'glass',
})

assertEqual(clamped.themeMode, appearanceDefaults.themeMode, 'invalid mode fallback')
assertEqual(clamped.accentColor, appearanceDefaults.accentColor, 'invalid accent fallback')
assertEqual(clamped.homeLayout, appearanceDefaults.homeLayout, 'invalid layout fallback')
assertEqual(clamped.coverStyle, appearanceDefaults.coverStyle, 'invalid cover fallback')
