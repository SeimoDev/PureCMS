import { normalizeLanguageCode } from './i18n'

export type MaintenanceUIText = {
  settingsTitle: string
  settingsEnabled: string
  settingsDescription: string
  messageLabel: string
  messageHelper: string
  publicTitle: string
  publicDefaultMessage: string
  adminEntry: string
}

const zhCN: MaintenanceUIText = {
  settingsTitle: '维护模式',
  settingsEnabled: '临时关闭前台访问',
  settingsDescription: '开启后公开前台只显示维护提示，后台登录和管理功能保持可用，适合升级、导入备份或数据库恢复窗口。',
  messageLabel: '维护提示',
  messageHelper: '留空时使用默认提示，面向公开访客展示。',
  publicTitle: '站点维护中',
  publicDefaultMessage: '站点正在维护，请稍后再访问。',
  adminEntry: '进入后台',
}

const textByLanguage: Record<string, MaintenanceUIText> = {
  'zh-CN': zhCN,
  'zh-TW': {
    settingsTitle: '維護模式',
    settingsEnabled: '暫時關閉前台訪問',
    settingsDescription: '開啟後公開前台只顯示維護提示，後台登入和管理功能保持可用，適合升級、匯入備份或資料庫恢復窗口。',
    messageLabel: '維護提示',
    messageHelper: '留空時使用預設提示，面向公開訪客展示。',
    publicTitle: '網站維護中',
    publicDefaultMessage: '網站正在維護，請稍後再訪問。',
    adminEntry: '進入後台',
  },
  en: {
    settingsTitle: 'Maintenance Mode',
    settingsEnabled: 'Temporarily close the public site',
    settingsDescription: 'When enabled, public pages show only a maintenance notice while login and admin remain available for upgrades, backup imports, or database restore windows.',
    messageLabel: 'Maintenance notice',
    messageHelper: 'Leave blank to use the default public visitor notice.',
    publicTitle: 'Site Under Maintenance',
    publicDefaultMessage: 'The site is under maintenance. Please check back later.',
    adminEntry: 'Admin',
  },
  ja: {
    settingsTitle: 'メンテナンスモード',
    settingsEnabled: '公開サイトを一時停止',
    settingsDescription: '有効にすると公開ページはメンテナンス案内のみを表示し、ログインと管理画面は利用できます。',
    messageLabel: 'メンテナンス案内',
    messageHelper: '空欄の場合は既定の案内を表示します。',
    publicTitle: 'メンテナンス中',
    publicDefaultMessage: 'サイトはメンテナンス中です。しばらくしてから再度アクセスしてください。',
    adminEntry: '管理画面',
  },
  fr: {
    settingsTitle: 'Mode maintenance',
    settingsEnabled: 'Fermer temporairement le site public',
    settingsDescription: 'Une fois activé, les pages publiques affichent seulement un avis de maintenance tandis que la connexion et l’administration restent disponibles.',
    messageLabel: 'Avis de maintenance',
    messageHelper: 'Laissez vide pour utiliser l’avis public par défaut.',
    publicTitle: 'Site en maintenance',
    publicDefaultMessage: 'Le site est en maintenance. Veuillez revenir plus tard.',
    adminEntry: 'Administration',
  },
  hi: {
    settingsTitle: 'मेंटेनेंस मोड',
    settingsEnabled: 'सार्वजनिक साइट अस्थायी रूप से बंद करें',
    settingsDescription: 'चालू होने पर सार्वजनिक पेज केवल मेंटेनेंस सूचना दिखाते हैं, जबकि लॉगिन और प्रशासन उपलब्ध रहते हैं।',
    messageLabel: 'मेंटेनेंस सूचना',
    messageHelper: 'डिफ़ॉल्ट सूचना दिखाने के लिए खाली छोड़ें।',
    publicTitle: 'साइट मेंटेनेंस में है',
    publicDefaultMessage: 'साइट मेंटेनेंस में है। कृपया बाद में फिर आएं।',
    adminEntry: 'प्रशासन',
  },
  es: {
    settingsTitle: 'Modo mantenimiento',
    settingsEnabled: 'Cerrar temporalmente el sitio público',
    settingsDescription: 'Al activarlo, las páginas públicas solo muestran un aviso de mantenimiento y el acceso administrativo sigue disponible.',
    messageLabel: 'Aviso de mantenimiento',
    messageHelper: 'Déjalo vacío para usar el aviso público predeterminado.',
    publicTitle: 'Sitio en mantenimiento',
    publicDefaultMessage: 'El sitio está en mantenimiento. Vuelve más tarde.',
    adminEntry: 'Administración',
  },
  ar: {
    settingsTitle: 'وضع الصيانة',
    settingsEnabled: 'إغلاق الموقع العام مؤقتًا',
    settingsDescription: 'عند التفعيل تعرض الصفحات العامة تنبيه الصيانة فقط، بينما يبقى تسجيل الدخول والإدارة متاحين.',
    messageLabel: 'تنبيه الصيانة',
    messageHelper: 'اتركه فارغًا لاستخدام التنبيه الافتراضي للزوار.',
    publicTitle: 'الموقع قيد الصيانة',
    publicDefaultMessage: 'الموقع قيد الصيانة. يرجى العودة لاحقًا.',
    adminEntry: 'الإدارة',
  },
  ru: {
    settingsTitle: 'Режим обслуживания',
    settingsEnabled: 'Временно закрыть публичный сайт',
    settingsDescription: 'При включении публичные страницы показывают только сообщение об обслуживании, а вход и админка остаются доступны.',
    messageLabel: 'Сообщение об обслуживании',
    messageHelper: 'Оставьте пустым, чтобы использовать сообщение по умолчанию.',
    publicTitle: 'Сайт на обслуживании',
    publicDefaultMessage: 'Сайт находится на обслуживании. Пожалуйста, зайдите позже.',
    adminEntry: 'Админка',
  },
  pt: {
    settingsTitle: 'Modo de manutenção',
    settingsEnabled: 'Fechar temporariamente o site público',
    settingsDescription: 'Quando ativado, as páginas públicas mostram apenas um aviso de manutenção, enquanto login e administração continuam disponíveis.',
    messageLabel: 'Aviso de manutenção',
    messageHelper: 'Deixe em branco para usar o aviso público padrão.',
    publicTitle: 'Site em manutenção',
    publicDefaultMessage: 'O site está em manutenção. Volte mais tarde.',
    adminEntry: 'Administração',
  },
  eo: {
    settingsTitle: 'Prizorga reĝimo',
    settingsEnabled: 'Provizore fermi la publikan retejon',
    settingsDescription: 'Kiam ŝaltita, publikaj paĝoj montras nur prizorgan avizon, dum ensaluto kaj administrado restas disponeblaj.',
    messageLabel: 'Prizorga avizo',
    messageHelper: 'Lasu malplena por uzi la defaŭltan publikan avizon.',
    publicTitle: 'Retejo prizorgata',
    publicDefaultMessage: 'La retejo estas prizorgata. Bonvolu reveni poste.',
    adminEntry: 'Administrado',
  },
}

export function maintenanceUIText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return textByLanguage[code] ?? zhCN
}
