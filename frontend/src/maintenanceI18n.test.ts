import { supportedLanguages } from './i18n.js'
import { maintenanceUIText } from './maintenanceI18n.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

for (const language of supportedLanguages) {
  const text = maintenanceUIText(language.code)
  if (!text.settingsTitle || !text.settingsEnabled || !text.publicTitle || !text.publicDefaultMessage || !text.adminEntry) {
    throw new Error(`missing maintenance UI text for ${language.code}`)
  }
}

assertEqual(maintenanceUIText('en-US').publicTitle, 'Site Under Maintenance', 'English locale fallback')
assertEqual(maintenanceUIText('pt-BR').settingsTitle, 'Modo de manutenção', 'Portuguese locale fallback')
assertEqual(maintenanceUIText('zh-Hant').adminEntry, '進入後台', 'Traditional Chinese locale fallback')
