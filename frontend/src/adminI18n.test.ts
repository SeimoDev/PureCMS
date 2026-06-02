import { adminUIText } from './adminI18n.js'
import { supportedLanguages } from './i18n.js'
import { passwordPolicyHelperText } from './passwordPolicy.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

for (const language of supportedLanguages) {
  const text = adminUIText(language.code)
  if (
    !text.shell.title ||
    !text.shell.nav.dashboard ||
    !text.shell.nav.posts ||
    !text.shell.nav.settings ||
    !text.login.title ||
    !text.login.username ||
    !text.account.title ||
    !text.account.updatePassword
  ) {
    throw new Error(`missing admin UI text for ${language.code}`)
  }
  if (!passwordPolicyHelperText(language.code).includes('10')) {
    throw new Error(`password helper should mention length for ${language.code}`)
  }
}

assertEqual(adminUIText('en').shell.nav.posts, 'Posts', 'English admin posts nav')
assertEqual(adminUIText('en').login.submit, 'Log in', 'English admin login submit')
assertEqual(adminUIText('ja').account.updatePassword, '更新', 'Japanese account password button')
assertEqual(adminUIText('pt-BR').shell.nav.settings, 'Configurações', 'Portuguese browser locale fallback')
assertEqual(adminUIText('ar').shell.title, 'الإدارة', 'Arabic admin title')
