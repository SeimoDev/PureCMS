import { normalizeLanguageCode } from './i18n'

export const passwordPolicyHelper = '至少 10 位，并包含大写字母、小写字母和数字'

const passwordPolicyHelperByLanguage: Record<string, string> = {
  'zh-CN': passwordPolicyHelper,
  'zh-TW': '至少 10 位，並包含大寫字母、小寫字母和數字',
  en: 'At least 10 characters, including uppercase, lowercase, and a number',
  ja: '10 文字以上で、大文字・小文字・数字を含めてください',
  fr: 'Au moins 10 caractères, avec majuscule, minuscule et chiffre',
  hi: 'कम से कम 10 अक्षर, जिनमें बड़ा अक्षर, छोटा अक्षर और अंक शामिल हों',
  es: 'Al menos 10 caracteres, con mayúscula, minúscula y número',
  ar: '10 أحرف على الأقل، مع حرف كبير وحرف صغير ورقم',
  ru: 'Не менее 10 символов, включая заглавную, строчную буквы и цифру',
  pt: 'Pelo menos 10 caracteres, incluindo maiúscula, minúscula e número',
  eo: 'Almenaŭ 10 signoj, kun majusklo, minusklo kaj numero',
}

export function passwordPolicyHelperText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return passwordPolicyHelperByLanguage[code] ?? passwordPolicyHelper
}

export function isStrongPassword(password: string) {
  const value = password.trim()
  return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)
}
