import {
  activityLogRetentionLabel,
  formatSystemBytes,
  formatUptimeSeconds,
  normalizeActivityLogRetentionDays,
  normalizeSystemStatusPayload,
  systemChecklist,
  systemStatusTone,
} from './systemStatus.js'
import { systemPageUIText } from './systemPageI18n.js'
import type { SystemStatus } from './types.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

const healthy: SystemStatus = {
  generatedAt: '2026-06-01T00:00:00Z',
  database: { status: 'ok', latencyMs: 12, totalConns: 4, acquiredConns: 1, idleConns: 3 },
  storage: { status: 'ok', uploadDir: 'uploads', exists: true, writable: true, fileCount: 2, totalBytes: 1536 },
  content: {
    posts: 4,
    trashedPosts: 0,
    pages: 2,
    trashedPages: 0,
    mediaAssets: 2,
    comments: 8,
    users: 1,
    activityLogs: 12,
    translationCaches: 3,
    staleTranslationCaches: 0,
    translationJobs: 3,
    runningTranslationJobs: 0,
    failedTranslationJobs: 0,
  },
  translation: {
    enabled: true,
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    apiKeyConfigured: true,
    cacheCount: 3,
    staleCacheCount: 0,
    jobCount: 3,
    runningJobCount: 0,
    failedJobCount: 0,
    supportedLanguages: [],
  },
  runtime: {
    goVersion: 'go1.24.0',
    os: 'linux',
    arch: 'amd64',
    processId: 12,
    startedAt: '2026-06-01T00:00:00Z',
    uptimeSeconds: 3720,
  },
  deployment: {
    status: 'ok',
    checks: [
      {
        key: 'jwt-secret',
        label: 'JWT 密钥',
        ok: true,
        severity: 'ok',
        detail: '已使用自定义长密钥',
      },
    ],
  },
}

assertEqual(systemStatusTone(healthy.database.status).label, '正常', 'ok tone label')
assertEqual(systemStatusTone('error').label, '异常', 'error tone label')
assertEqual(formatSystemBytes(1536), '1.5 KB', 'kb formatting')
assertEqual(formatUptimeSeconds(3720), '1 小时 2 分钟', 'hour uptime formatting')
assertEqual(formatUptimeSeconds(172810), '2 天 0 小时', 'day uptime formatting')
assertEqual(normalizeActivityLogRetentionDays(3), 7, 'retention minimum')
assertEqual(normalizeActivityLogRetentionDays(99999), 3650, 'retention maximum')
assertEqual(activityLogRetentionLabel(90, 12), '清理 90 天前日志，预计影响 12 条', 'retention label')

const checks = systemChecklist(healthy)
assertEqual(checks.length, 7, 'check count')
assertEqual(checks.every((check) => check.ok), true, 'healthy checks')

const broken = {
  ...healthy,
  storage: { ...healthy.storage, writable: false },
  translation: { ...healthy.translation, enabled: true, apiKeyConfigured: false },
} satisfies SystemStatus

const brokenChecks = systemChecklist(broken)
assertEqual(brokenChecks.find((check) => check.key === 'storage')?.ok, false, 'storage check fails')
assertEqual(brokenChecks.find((check) => check.key === 'translation')?.ok, false, 'translation check fails when key missing')

const trashy = {
  ...healthy,
  content: { ...healthy.content, trashedPosts: 2, trashedPages: 1 },
} satisfies SystemStatus

const trashChecks = systemChecklist(trashy)
assertEqual(trashChecks.find((check) => check.key === 'trash')?.ok, false, 'trash check fails when content is waiting')
assertEqual(trashChecks.find((check) => check.key === 'trash')?.detail, '3 项待处理', 'trash check detail')

const translationFailures = {
  ...healthy,
  content: { ...healthy.content, failedTranslationJobs: 2, runningTranslationJobs: 1 },
  translation: { ...healthy.translation, failedJobCount: 2, runningJobCount: 1 },
} satisfies SystemStatus

const translationFailureChecks = systemChecklist(translationFailures)
assertEqual(translationFailureChecks.find((check) => check.key === 'translation-cache')?.ok, false, 'translation cache check fails on failed jobs')

const unsafeDeployment = {
  ...healthy,
  deployment: {
    status: 'warning',
    checks: [
      {
        key: 'jwt-secret',
        label: 'JWT 密钥',
        ok: false,
        severity: 'warning',
        detail: '请设置 32 字符以上随机 JWT_SECRET',
      },
    ],
  },
} satisfies SystemStatus

const deploymentChecks = systemChecklist(unsafeDeployment)
assertEqual(deploymentChecks.find((check) => check.key === 'deployment')?.ok, false, 'deployment check fails when warnings exist')
assertEqual(deploymentChecks.find((check) => check.key === 'deployment')?.detail, '1 项需处理', 'deployment check detail')

const enText = systemPageUIText('en')
const enChecks = systemChecklist(unsafeDeployment, enText.system, enText.locale)
assertEqual(systemStatusTone('warning', enText.system).label, 'Needs attention', 'localized warning tone')
assertEqual(formatUptimeSeconds(3720, enText.system), '1h 2m', 'localized uptime')
assertEqual(enChecks.find((check) => check.key === 'deployment')?.detail, '1 items need attention', 'localized deployment detail')
assertEqual(
  systemChecklist(translationFailures, enText.system, enText.locale).find((check) => check.key === 'translation-cache')?.detail,
  '3 caches, 0 stale, 1 running, 2 failed',
  'localized translation job detail',
)

const legacy = normalizeSystemStatusPayload({
  generatedAt: healthy.generatedAt,
  database: healthy.database,
  storage: healthy.storage,
  content: {
    posts: 1,
    pages: 1,
  },
  translation: {
    enabled: false,
  },
})
assertEqual(legacy.runtime.goVersion, '-', 'missing runtime fallback')
assertEqual(legacy.content.translationCaches, 0, 'missing translation cache count fallback')
assertEqual(legacy.translation.failedJobCount, 0, 'missing translation job count fallback')
assertEqual(systemChecklist(legacy).find((check) => check.key === 'runtime')?.ok, true, 'legacy runtime does not crash')
