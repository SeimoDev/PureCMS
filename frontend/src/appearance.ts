import type { SiteSettings } from './types'

export type ThemeMode = 'light' | 'dark'
export type HomeLayout = 'cards' | 'list'
export type CoverStyle = 'image' | 'plain'

export type AppearanceSettings = {
  themeMode: ThemeMode
  accentColor: string
  homeLayout: HomeLayout
  coverStyle: CoverStyle
}

export const appearanceAccentOptions = [
  { value: '#256B57' },
  { value: '#B3261E' },
  { value: '#6750A4' },
  { value: '#B26A00' },
] as const

export const appearanceDefaults: AppearanceSettings = {
  themeMode: 'light',
  accentColor: '#256B57',
  homeLayout: 'cards',
  coverStyle: 'image',
}

function stringValue(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeAppearanceSettings(value: SiteSettings['appearance'] | Record<string, unknown> | undefined): AppearanceSettings {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const themeMode = stringValue(source, 'themeMode')
  const accentColor = stringValue(source, 'accentColor').toUpperCase()
  const homeLayout = stringValue(source, 'homeLayout')
  const coverStyle = stringValue(source, 'coverStyle')

  return {
    themeMode: themeMode === 'dark' ? 'dark' : appearanceDefaults.themeMode,
    accentColor: appearanceAccentOptions.some((option) => option.value === accentColor) ? accentColor : appearanceDefaults.accentColor,
    homeLayout: homeLayout === 'list' ? 'list' : appearanceDefaults.homeLayout,
    coverStyle: coverStyle === 'plain' ? 'plain' : appearanceDefaults.coverStyle,
  }
}
