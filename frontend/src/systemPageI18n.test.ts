import { deploymentCheckText, systemPageUIText } from './systemPageI18n.js'
import type { SystemDeploymentCheck } from './types.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const warningCheck: SystemDeploymentCheck = {
  key: 'jwt-secret',
  label: 'JWT fallback',
  ok: false,
  severity: 'warning',
  detail: 'fallback detail',
}

assertEqual(systemPageUIText('zh-CN').title, '系统状态', 'simplified chinese title')
assertEqual(systemPageUIText('zh-Hant').title, '系統狀態', 'traditional chinese matching')
assertEqual(systemPageUIText('en-US').title, 'System Status', 'english matching')
assertEqual(systemPageUIText('en-US').runningTranslationJobs?.(2), 'Running 2', 'english running translation jobs')
assertEqual(systemPageUIText('en-US').contentLabels.translationJobs, 'Translation jobs', 'english translation job metric label')
assertEqual(systemPageUIText('en-US').contentLabels.failedTranslationJobs, 'Failed jobs', 'english failed translation job metric label')
assertEqual(systemPageUIText('zh-CN').failedTranslationJobs?.(3), '失败 3', 'chinese failed translation jobs')
assertEqual(systemPageUIText('zh-CN').contentLabels.translationJobs, '翻译任务', 'chinese translation job metric label')
assertEqual(systemPageUIText('pt-BR').title, 'Status do sistema', 'portuguese matching')
assertEqual(systemPageUIText('pt-BR').contentLabels.failedTranslationJobs, 'Failed jobs', 'portuguese failed translation job metric fallback')
assertEqual(systemPageUIText('ja').title, 'システム状態', 'japanese title')
assertEqual(systemPageUIText('fr').retry, 'Réessayer', 'french retry')
assertEqual(systemPageUIText('es').refresh, 'Actualizar estado', 'spanish refresh')
assertEqual(systemPageUIText('ar').title, 'حالة النظام', 'arabic title')
assertEqual(systemPageUIText('ru').title, 'Состояние системы', 'russian title')
assertEqual(systemPageUIText('eo').title, 'Sistema Stato', 'esperanto title')
assertEqual(systemPageUIText('unknown').title, '系统状态', 'unknown language fallback')

const zhWarning = deploymentCheckText(warningCheck, systemPageUIText('zh-CN'))
assertEqual(zhWarning.label, 'JWT 密钥', 'localized deployment check label')
assertEqual(zhWarning.detail.includes('JWT_SECRET'), true, 'localized deployment check warning detail')

const enOk = deploymentCheckText({ ...warningCheck, ok: true }, systemPageUIText('en'))
assertEqual(enOk.label, 'JWT secret', 'english deployment check label')
assertEqual(enOk.detail, 'Custom long secret is configured', 'english deployment check ok detail')

const adminUsernameWarning = deploymentCheckText(
  { ...warningCheck, key: 'admin-username', ok: false },
  systemPageUIText('en'),
)
assertEqual(adminUsernameWarning.label, 'Admin username', 'admin username check label')
assertEqual(adminUsernameWarning.detail.includes('ADMIN_USERNAME'), true, 'admin username check warning detail')

const maintenanceWarning = deploymentCheckText(
  { ...warningCheck, key: 'maintenance-mode', ok: false },
  systemPageUIText('en'),
)
assertEqual(maintenanceWarning.label, 'Maintenance mode', 'maintenance check label')
assertEqual(
  maintenanceWarning.detail.includes('Public APIs'),
  true,
  'maintenance check warning detail',
)

const corsWarning = deploymentCheckText({ ...warningCheck, key: 'cors-origins', ok: false }, systemPageUIText('en'))
assertEqual(corsWarning.detail.includes('HTTP(S)'), true, 'cors warning should mention HTTP(S)')
assertEqual(corsWarning.detail.includes('private network'), true, 'cors warning should mention private network origins')

const publicURLWarning = deploymentCheckText({ ...warningCheck, key: 'public-url', ok: false }, systemPageUIText('en'))
assertEqual(publicURLWarning.detail.includes('HTTP(S)'), true, 'public URL warning should mention HTTP(S)')
assertEqual(publicURLWarning.detail.includes('localhost'), true, 'public URL warning should mention localhost')
assertEqual(publicURLWarning.detail.includes('private network'), true, 'public URL warning should mention private networks')

const fallback = deploymentCheckText({ ...warningCheck, key: 'custom-check' }, systemPageUIText('en'))
assertEqual(fallback.label, 'JWT fallback', 'unknown deployment check label fallback')
assertEqual(fallback.detail, 'fallback detail', 'unknown deployment check detail fallback')
