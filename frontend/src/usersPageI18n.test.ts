import { supportedLanguages } from './i18n.js'
import { usersPageUIText } from './usersPageI18n.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const cjk = /[\u4E00-\u9FFF]/
const simplifiedFragments = ['用户权限', '批量账号管理', '当前账号', '新建用户', '重置密码', '最近登录']

for (const language of supportedLanguages) {
  const text = usersPageUIText(language.code)
  if (
    !text.title ||
    !text.searchPlaceholder ||
    !text.bulkTitle ||
    !text.createUser ||
    !text.tableAccount ||
    !text.tableResetPassword ||
    !text.roleLabels.admin ||
    !text.statusLabels.active ||
    !text.emptyDescription
  ) {
    throw new Error(`missing users page UI text for ${language.code}`)
  }

  const core = [
    text.title,
    text.subtitle,
    text.info,
    text.searchPlaceholder,
    text.bulkTitle,
    text.createUser,
    text.currentAccount,
    text.tableResetPassword,
    text.tableLastLogin,
    text.roleLabels.admin,
    text.statusLabels.active,
  ].join(' ')

  if (language.code !== 'zh-CN' && language.code !== 'zh-TW') {
    for (const fragment of simplifiedFragments) {
      if (core.includes(fragment)) {
        throw new Error(`users page ${language.code} leaked Simplified Chinese fragment ${fragment}: ${core}`)
      }
    }
  }
  if (!['zh-CN', 'zh-TW', 'ja'].includes(language.code) && cjk.test(core)) {
    throw new Error(`users page ${language.code} leaked CJK characters: ${core}`)
  }
}

assertEqual(usersPageUIText('en').title, 'Users', 'English title')
assertEqual(usersPageUIText('ar').roleLabels.admin, 'مدير', 'Arabic admin label')
assertEqual(usersPageUIText('ja').bulkEnable, '一括有効化', 'Japanese bulk enable')
assertEqual(usersPageUIText('pt-BR').createUser, 'Criar usuário', 'Portuguese locale fallback')
assertEqual(usersPageUIText('zh-Hant').currentAccount, '目前帳號', 'Traditional Chinese locale fallback')
