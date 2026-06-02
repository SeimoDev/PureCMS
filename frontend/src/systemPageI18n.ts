import { normalizeLanguageCode } from './i18n.js'
import { defaultSystemStatusMessages, type SystemStatusMessages } from './systemStatus.js'
import type { SystemContentStats, SystemDeploymentCheck } from './types.js'

type ContentMetricKey = keyof SystemContentStats
type RequiredContentMetricKey = Exclude<ContentMetricKey, 'translationJobs' | 'runningTranslationJobs' | 'failedTranslationJobs'>
type DeploymentCheckCopy = Record<string, { label: string; okDetail: string; warningDetail: string }>

export type SystemPageUIText = {
  title: string
  subtitle: string
  loadError: string
  loading: string
  retry: string
  refreshing: string
  refresh: string
  overview: string
  generatedAt: (value: string) => string
  healthItems: (healthy: number, total: number) => string
  started: (value: string) => string
  uptime: (value: string) => string
  passed: string
  actionRequired: string
  database: string
  totalConnections: (count: number) => string
  acquiredConnections: (count: number) => string
  idleConnections: (count: number) => string
  storage: string
  files: (count: number) => string
  writable: string
  notWritable: string
  translation: string
  enabled: string
  disabled: string
  apiKeyConfigured: string
  apiKeyMissing: string
  staleCaches: (count: number) => string
  runningTranslationJobs?: (count: number) => string
  failedTranslationJobs?: (count: number) => string
  deployment: string
  contentData: string
  contentLabels: Record<RequiredContentMetricKey, string> & Partial<Record<ContentMetricKey, string>>
  maintenance: string
  retentionDays: string
  cleaning: string
  cleanOldLogs: string
  cleanConfirm: (days: number) => string
  cleanNotice: (deleted: number, days: number) => string
  cleanError: string
  deploymentChecks: DeploymentCheckCopy
  system: SystemStatusMessages
  locale: string
}

const zhCNDeploymentChecks: DeploymentCheckCopy = {
  'jwt-secret': {
    label: 'JWT 密钥',
    okDetail: '已使用自定义长密钥',
    warningDetail: '请设置 32 字符以上随机 JWT_SECRET，避免使用默认值或占位值',
  },
  'admin-username': {
    label: '管理员用户名',
    okDetail: '管理员用户名已改为非默认值',
    warningDetail: '请修改默认 ADMIN_USERNAME，避免公开系统暴露固定登录账号',
  },
  'admin-password': {
    label: '初始化管理员密码',
    okDetail: '初始化密码已修改且满足强度要求',
    warningDetail: '请修改默认 ADMIN_PASSWORD，默认密码只适合本地演示',
  },
  'database-password': {
    label: '数据库密码',
    okDetail: '数据库连接串未使用示例密码',
    warningDetail: '请修改 PostgreSQL 默认密码并同步 DATABASE_URL',
  },
  'cors-origins': {
    label: 'CORS 来源',
    okDetail: 'CORS 已显式限制来源',
    warningDetail: '请配置真实公开的 HTTP(S) CORS_ORIGINS，避免使用通配符、本机或内网来源',
  },
  'public-url': {
    label: '公开访问地址',
    okDetail: 'FRONTEND_URL 和 PUBLIC_API_URL 已指向公开地址',
    warningDetail: '生产部署时请把 FRONTEND_URL/PUBLIC_API_URL 改为真实公开的 HTTP(S) 域名，不要保留 localhost、内网地址或非 HTTP 协议',
  },
  'maintenance-mode': {
    label: '维护模式',
    okDetail: '公开访问正常开放',
    warningDetail: '维护模式正在开启。公开 API、RSS、sitemap 和 robots 已进入维护状态，请确认这是计划内操作。',
  },
}

const enSystem: SystemStatusMessages = {
  tones: { ok: 'OK', warning: 'Needs attention', error: 'Error' },
  uptime: {
    dayHour: (days, hours) => `${days}d ${hours}h`,
    hourMinute: (hours, minutes) => `${hours}h ${minutes}m`,
    minute: (minutes) => `${minutes}m`,
    second: (seconds) => `${seconds}s`,
  },
  retentionLabel: (days, estimatedCount) => `Clean logs older than ${days} days. Estimated affected logs: ${estimatedCount}`,
  checklist: {
    database: 'Database connection',
    databaseDetail: (latencyMs, acquiredConns, totalConns) => `${latencyMs} ms, connections ${acquiredConns}/${totalConns}`,
    storage: 'Upload directory',
    storageDetail: (fileCount, bytes) => `${fileCount} files, ${bytes}`,
    translation: 'AI translation',
    translationDisabled: 'Disabled',
    trash: 'Content trash',
    trashOk: 'No pending content',
    trashPending: (count) => `${count} pending items`,
    translationCache: 'Translation cache',
    translationCacheDetail: (total, stale, running = 0, failed = 0) =>
      `${total} caches, ${stale} stale${running > 0 ? `, ${running} running` : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
    runtime: 'Runtime',
    deployment: 'Deployment security',
    deploymentOk: 'Production security baseline passed',
    deploymentPending: (count) => `${count} items need attention`,
  },
}

const enDeploymentChecks: DeploymentCheckCopy = {
  'jwt-secret': {
    label: 'JWT secret',
    okDetail: 'Custom long secret is configured',
    warningDetail: 'Set a random JWT_SECRET with at least 32 characters and avoid defaults or placeholders',
  },
  'admin-username': {
    label: 'Admin username',
    okDetail: 'Admin username has been changed from the default',
    warningDetail: 'Change the default ADMIN_USERNAME so the public system does not expose a fixed login account',
  },
  'admin-password': {
    label: 'Initial admin password',
    okDetail: 'Initial password has been changed and meets policy',
    warningDetail: 'Change the default ADMIN_PASSWORD. The default password is only for local demos',
  },
  'database-password': {
    label: 'Database password',
    okDetail: 'Database URL is not using the sample password',
    warningDetail: 'Change the default PostgreSQL password and sync DATABASE_URL',
  },
  'cors-origins': {
    label: 'CORS origins',
    okDetail: 'CORS origins are explicitly restricted',
    warningDetail: 'Configure real public HTTP(S) CORS_ORIGINS and avoid wildcards, localhost, or private network origins',
  },
  'public-url': {
    label: 'Public URLs',
    okDetail: 'FRONTEND_URL and PUBLIC_API_URL point to public addresses',
    warningDetail: 'Use real public HTTP(S) domains for FRONTEND_URL/PUBLIC_API_URL instead of localhost, private network addresses, or non-HTTP schemes',
  },
  'maintenance-mode': {
    label: 'Maintenance mode',
    okDetail: 'Public access is open',
    warningDetail: 'Maintenance mode is enabled. Public APIs, RSS, sitemap, and robots are in maintenance state.',
  },
}

const zhCN: SystemPageUIText = {
  title: '系统状态',
  subtitle: '巡检数据库、上传目录、内容规模与 AI 翻译配置。',
  loadError: '读取系统状态失败',
  loading: '读取系统状态',
  retry: '重试',
  refreshing: '正在刷新',
  refresh: '刷新状态',
  overview: '运行概览',
  generatedAt: (value) => `生成时间 ${value}`,
  healthItems: (healthy, total) => `健康项 ${healthy}/${total}`,
  started: (value) => `启动 ${value}`,
  uptime: (value) => `已运行 ${value}`,
  passed: '通过',
  actionRequired: '处理',
  database: '数据库',
  totalConnections: (count) => `总连接 ${count}`,
  acquiredConnections: (count) => `占用 ${count}`,
  idleConnections: (count) => `空闲 ${count}`,
  storage: '上传目录',
  files: (count) => `${count} 个文件`,
  writable: '可写',
  notWritable: '不可写',
  translation: 'AI 翻译',
  enabled: '已启用',
  disabled: '未启用',
  apiKeyConfigured: '密钥已配置',
  apiKeyMissing: '缺少密钥',
  staleCaches: (count) => `过期缓存 ${count}`,
  runningTranslationJobs: (count) => `翻译中 ${count}`,
  failedTranslationJobs: (count) => `失败 ${count}`,
  deployment: '部署安全',
  contentData: '内容与后台数据',
  contentLabels: {
    posts: '文章',
    trashedPosts: '文章回收站',
    pages: '页面',
    trashedPages: '页面回收站',
    mediaAssets: '媒体',
    comments: '评论',
    users: '用户',
    activityLogs: '日志',
    translationCaches: '翻译缓存',
    staleTranslationCaches: '过期翻译',
    translationJobs: '翻译任务',
    runningTranslationJobs: '翻译中',
    failedTranslationJobs: '翻译失败',
  },
  maintenance: '维护动作',
  retentionDays: '保留天数',
  cleaning: '正在清理',
  cleanOldLogs: '清理旧日志',
  cleanConfirm: (days) => `确认清理 ${days} 天前的操作日志？该操作会保留一条新的清理审计记录。`,
  cleanNotice: (deleted, days) => `已清理 ${deleted} 条 ${days} 天前的操作日志。`,
  cleanError: '清理操作日志失败',
  deploymentChecks: zhCNDeploymentChecks,
  system: defaultSystemStatusMessages,
  locale: 'zh-CN',
}

const zhTWSystem: SystemStatusMessages = {
  ...defaultSystemStatusMessages,
  tones: { ok: '正常', warning: '需注意', error: '異常' },
  retentionLabel: (days, estimatedCount) => `清理 ${days} 天前記錄，預計影響 ${estimatedCount} 筆`,
  checklist: {
    ...defaultSystemStatusMessages.checklist,
    trashPending: (count) => `${count} 項待處理`,
    deploymentPending: (count) => `${count} 項需處理`,
  },
}

const zhTW: SystemPageUIText = {
  ...zhCN,
  title: '系統狀態',
  subtitle: '巡檢資料庫、上傳目錄、內容規模與 AI 翻譯設定。',
  loadError: '讀取系統狀態失敗',
  loading: '讀取系統狀態',
  retry: '重試',
  refresh: '重新整理狀態',
  overview: '執行概覽',
  generatedAt: (value) => `產生時間 ${value}`,
  healthItems: (healthy, total) => `健康項 ${healthy}/${total}`,
  database: '資料庫',
  storage: '上傳目錄',
  files: (count) => `${count} 個檔案`,
  writable: '可寫入',
  notWritable: '不可寫入',
  translation: 'AI 翻譯',
  enabled: '已啟用',
  disabled: '未啟用',
  deployment: '部署安全',
  contentData: '內容與後台資料',
  maintenance: '維護動作',
  cleanOldLogs: '清理舊記錄',
  deploymentChecks: {
    ...zhCNDeploymentChecks,
    'jwt-secret': { label: 'JWT 金鑰', okDetail: '已使用自訂長金鑰', warningDetail: '請設定 32 字元以上隨機 JWT_SECRET，避免使用預設值或佔位值' },
  },
  system: zhTWSystem,
  locale: 'zh-TW',
}

const en: SystemPageUIText = {
  ...zhCN,
  title: 'System Status',
  subtitle: 'Inspect database, upload storage, content scale, and AI translation configuration.',
  loadError: 'Failed to load system status',
  loading: 'Loading system status',
  retry: 'Retry',
  refreshing: 'Refreshing',
  refresh: 'Refresh status',
  overview: 'Runtime Overview',
  generatedAt: (value) => `Generated ${value}`,
  healthItems: (healthy, total) => `Healthy ${healthy}/${total}`,
  started: (value) => `Started ${value}`,
  uptime: (value) => `Uptime ${value}`,
  passed: 'Passed',
  actionRequired: 'Action',
  database: 'Database',
  totalConnections: (count) => `Total ${count}`,
  acquiredConnections: (count) => `Acquired ${count}`,
  idleConnections: (count) => `Idle ${count}`,
  storage: 'Uploads',
  files: (count) => `${count} files`,
  writable: 'Writable',
  notWritable: 'Not writable',
  translation: 'AI Translation',
  enabled: 'Enabled',
  disabled: 'Disabled',
  apiKeyConfigured: 'API key configured',
  apiKeyMissing: 'Missing API key',
  staleCaches: (count) => `Stale caches ${count}`,
  runningTranslationJobs: (count) => `Running ${count}`,
  failedTranslationJobs: (count) => `Failed ${count}`,
  deployment: 'Deployment Security',
  contentData: 'Content and Admin Data',
  contentLabels: {
    posts: 'Posts',
    trashedPosts: 'Post trash',
    pages: 'Pages',
    trashedPages: 'Page trash',
    mediaAssets: 'Media',
    comments: 'Comments',
    users: 'Users',
    activityLogs: 'Logs',
    translationCaches: 'Translation caches',
    staleTranslationCaches: 'Stale translations',
    translationJobs: 'Translation jobs',
    runningTranslationJobs: 'Running jobs',
    failedTranslationJobs: 'Failed jobs',
  },
  maintenance: 'Maintenance',
  retentionDays: 'Retention days',
  cleaning: 'Cleaning',
  cleanOldLogs: 'Clean old logs',
  cleanConfirm: (days) => `Clean activity logs older than ${days} days? A new cleanup audit record will be kept.`,
  cleanNotice: (deleted, days) => `${deleted} activity logs older than ${days} days cleaned.`,
  cleanError: 'Failed to clean activity logs',
  deploymentChecks: enDeploymentChecks,
  system: enSystem,
  locale: 'en',
}

const ja: SystemPageUIText = {
  ...en,
  title: 'システム状態',
  subtitle: 'データベース、アップロード領域、コンテンツ規模、AI 翻訳設定を確認します。',
  retry: '再試行',
  refreshing: '更新中',
  refresh: '状態を更新',
  overview: '実行概要',
  healthItems: (healthy, total) => `正常 ${healthy}/${total}`,
  passed: '合格',
  actionRequired: '対応',
  database: 'データベース',
  storage: 'アップロード',
  files: (count) => `${count} ファイル`,
  writable: '書き込み可',
  notWritable: '書き込み不可',
  enabled: '有効',
  disabled: '無効',
  deployment: 'デプロイ安全性',
  maintenance: 'メンテナンス',
  cleanOldLogs: '古いログを削除',
  cleanNotice: (deleted, days) => `${days} 日より古い操作ログを ${deleted} 件削除しました。`,
  locale: 'ja',
}

const fr: SystemPageUIText = {
  ...en,
  title: 'État du système',
  subtitle: 'Vérifiez la base de données, les fichiers, le contenu et la configuration de traduction IA.',
  retry: 'Réessayer',
  refreshing: 'Actualisation',
  refresh: 'Actualiser',
  overview: 'Vue d’ensemble',
  healthItems: (healthy, total) => `Sains ${healthy}/${total}`,
  passed: 'Validé',
  actionRequired: 'Action',
  database: 'Base de données',
  storage: 'Téléversements',
  files: (count) => `${count} fichiers`,
  writable: 'Accessible en écriture',
  notWritable: 'Non accessible',
  enabled: 'Activé',
  disabled: 'Désactivé',
  deployment: 'Sécurité du déploiement',
  maintenance: 'Maintenance',
  cleanOldLogs: 'Nettoyer les anciens journaux',
  cleanNotice: (deleted, days) => `${deleted} journaux de plus de ${days} jours ont été nettoyés.`,
  locale: 'fr',
}

const hi: SystemPageUIText = {
  ...en,
  title: 'सिस्टम स्थिति',
  subtitle: 'डेटाबेस, अपलोड संग्रह, सामग्री आकार और AI अनुवाद कॉन्फ़िगरेशन की जांच करें।',
  retry: 'फिर प्रयास करें',
  refresh: 'स्थिति रीफ़्रेश करें',
  overview: 'रनटाइम सारांश',
  passed: 'पास',
  actionRequired: 'कार्रवाई',
  database: 'डेटाबेस',
  storage: 'अपलोड',
  files: (count) => `${count} फ़ाइलें`,
  enabled: 'सक्षम',
  disabled: 'अक्षम',
  deployment: 'तैनाती सुरक्षा',
  maintenance: 'रखरखाव',
  locale: 'hi',
}

const es: SystemPageUIText = {
  ...en,
  title: 'Estado del sistema',
  subtitle: 'Revise la base de datos, los archivos, el contenido y la configuración de traducción con IA.',
  retry: 'Reintentar',
  refreshing: 'Actualizando',
  refresh: 'Actualizar estado',
  overview: 'Resumen de ejecución',
  generatedAt: (value) => `Generado ${value}`,
  healthItems: (healthy, total) => `Correctos ${healthy}/${total}`,
  passed: 'Aprobado',
  actionRequired: 'Acción',
  database: 'Base de datos',
  storage: 'Subidas',
  files: (count) => `${count} archivos`,
  writable: 'Escribible',
  notWritable: 'No escribible',
  enabled: 'Activado',
  disabled: 'Desactivado',
  deployment: 'Seguridad de despliegue',
  maintenance: 'Mantenimiento',
  cleanOldLogs: 'Limpiar registros antiguos',
  cleanNotice: (deleted, days) => `Se limpiaron ${deleted} registros de más de ${days} días.`,
  locale: 'es',
}

const ar: SystemPageUIText = {
  ...en,
  title: 'حالة النظام',
  subtitle: 'افحص قاعدة البيانات ومجلد الرفع وحجم المحتوى وإعدادات ترجمة الذكاء الاصطناعي.',
  retry: 'إعادة المحاولة',
  refresh: 'تحديث الحالة',
  overview: 'نظرة التشغيل',
  passed: 'ناجح',
  actionRequired: 'إجراء',
  database: 'قاعدة البيانات',
  storage: 'الملفات المرفوعة',
  files: (count) => `${count} ملف`,
  enabled: 'مفعل',
  disabled: 'معطل',
  deployment: 'أمان النشر',
  maintenance: 'الصيانة',
  locale: 'ar',
}

const ru: SystemPageUIText = {
  ...en,
  title: 'Состояние системы',
  subtitle: 'Проверка базы данных, хранилища загрузок, контента и настроек AI-перевода.',
  retry: 'Повторить',
  refresh: 'Обновить состояние',
  overview: 'Обзор выполнения',
  passed: 'Пройдено',
  actionRequired: 'Действие',
  database: 'База данных',
  storage: 'Загрузки',
  files: (count) => `${count} файлов`,
  enabled: 'Включено',
  disabled: 'Отключено',
  deployment: 'Безопасность развертывания',
  maintenance: 'Обслуживание',
  locale: 'ru',
}

const pt: SystemPageUIText = {
  ...en,
  title: 'Status do sistema',
  subtitle: 'Inspecione banco de dados, uploads, conteúdo e configuração de tradução por IA.',
  retry: 'Tentar novamente',
  refresh: 'Atualizar status',
  overview: 'Visão geral',
  passed: 'Aprovado',
  actionRequired: 'Ação',
  database: 'Banco de dados',
  storage: 'Uploads',
  files: (count) => `${count} arquivos`,
  enabled: 'Ativado',
  disabled: 'Desativado',
  deployment: 'Segurança da implantação',
  maintenance: 'Manutenção',
  locale: 'pt',
}

const eo: SystemPageUIText = {
  ...en,
  title: 'Sistema Stato',
  subtitle: 'Kontrolu datumbazon, alŝutojn, enhavan skalon kaj AI-tradukan agordon.',
  retry: 'Reprovi',
  refresh: 'Refreŝigi staton',
  overview: 'Rultempa superrigardo',
  passed: 'Pasita',
  actionRequired: 'Ago',
  database: 'Datumbazo',
  storage: 'Alŝutoj',
  files: (count) => `${count} dosieroj`,
  enabled: 'Ŝaltita',
  disabled: 'Malŝaltita',
  deployment: 'Deplojsekureco',
  maintenance: 'Prizorgado',
  locale: 'eo',
}

const textByLanguage: Record<string, SystemPageUIText> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  fr,
  hi,
  es,
  ar,
  ru,
  pt,
  eo,
}

export function systemPageUIText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  const base = textByLanguage[code] ?? zhCN
  return {
    ...base,
    contentLabels: {
      ...en.contentLabels,
      ...base.contentLabels,
    },
  }
}

export function deploymentCheckText(check: SystemDeploymentCheck, text: SystemPageUIText) {
  const override = text.deploymentChecks[check.key]
  if (!override) return { label: check.label, detail: check.detail }
  return { label: override.label, detail: check.ok ? override.okDetail : override.warningDetail }
}
