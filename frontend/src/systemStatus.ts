import type { SystemStatus } from './types.js'

export const defaultActivityLogRetentionDays = 180
export const minActivityLogRetentionDays = 7
export const maxActivityLogRetentionDays = 3650

export type SystemStatusMessages = {
  tones: {
    ok: string
    warning: string
    error: string
  }
  uptime: {
    dayHour: (days: number, hours: number) => string
    hourMinute: (hours: number, minutes: number) => string
    minute: (minutes: number) => string
    second: (seconds: number) => string
  }
  retentionLabel: (days: number, estimatedCount: number) => string
  checklist: {
    database: string
    databaseDetail: (latencyMs: number, acquiredConns: number, totalConns: number) => string
    storage: string
    storageDetail: (fileCount: number, bytes: string) => string
    translation: string
    translationDisabled: string
    trash: string
    trashOk: string
    trashPending: (count: number) => string
    translationCache: string
    translationCacheDetail: (total: number, stale: number, running?: number, failed?: number) => string
    runtime: string
    deployment: string
    deploymentOk: string
    deploymentPending: (count: number) => string
  }
}

export const defaultSystemStatusMessages: SystemStatusMessages = {
  tones: {
    ok: '正常',
    warning: '需关注',
    error: '异常',
  },
  uptime: {
    dayHour: (days, hours) => `${days} 天 ${hours} 小时`,
    hourMinute: (hours, minutes) => `${hours} 小时 ${minutes} 分钟`,
    minute: (minutes) => `${minutes} 分钟`,
    second: (seconds) => `${seconds} 秒`,
  },
  retentionLabel: (days, estimatedCount) => `清理 ${days} 天前日志，预计影响 ${estimatedCount} 条`,
  checklist: {
    database: '数据库连接',
    databaseDetail: (latencyMs, acquiredConns, totalConns) => `${latencyMs} ms，连接 ${acquiredConns}/${totalConns}`,
    storage: '上传目录',
    storageDetail: (fileCount, bytes) => `${fileCount} 个文件，${bytes}`,
    translation: 'AI 翻译',
    translationDisabled: '未启用',
    trash: '内容回收站',
    trashOk: '无待处理内容',
    trashPending: (count) => `${count} 项待处理`,
    translationCache: '翻译缓存',
    translationCacheDetail: (total, stale, running = 0, failed = 0) =>
      `${total} 条缓存，${stale} 条需清理${running > 0 ? `，${running} 个运行中` : ''}${failed > 0 ? `，${failed} 个失败` : ''}`,
    runtime: '运行时',
    deployment: '部署安全',
    deploymentOk: '生产安全基线已通过',
    deploymentPending: (count) => `${count} 项需处理`,
  },
}

export function systemStatusTone(status: string, messages: SystemStatusMessages = defaultSystemStatusMessages) {
  switch (status) {
    case 'ok':
      return { label: messages.tones.ok, color: 'success' as const }
    case 'warning':
      return { label: messages.tones.warning, color: 'warning' as const }
    default:
      return { label: messages.tones.error, color: 'error' as const }
  }
}

export function formatSystemBytes(value: number, locale = 'zh-CN') {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  if (value >= 1024 * 1024 * 1024) return `${formatter.format(value / 1024 / 1024 / 1024)} GB`
  if (value >= 1024 * 1024) return `${formatter.format(value / 1024 / 1024)} MB`
  if (value >= 1024) return `${formatter.format(value / 1024)} KB`
  return `${formatter.format(value)} B`
}

export function formatUptimeSeconds(value: number, messages: SystemStatusMessages = defaultSystemStatusMessages) {
  const total = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (days > 0) return messages.uptime.dayHour(days, hours)
  if (hours > 0) return messages.uptime.hourMinute(hours, minutes)
  if (minutes > 0) return messages.uptime.minute(minutes)
  return messages.uptime.second(total)
}

export function normalizeActivityLogRetentionDays(value: number) {
  if (!Number.isFinite(value)) return defaultActivityLogRetentionDays
  return Math.min(maxActivityLogRetentionDays, Math.max(minActivityLogRetentionDays, Math.trunc(value)))
}

export function activityLogRetentionLabel(days: number, estimatedCount: number, messages: SystemStatusMessages = defaultSystemStatusMessages) {
  return messages.retentionLabel(normalizeActivityLogRetentionDays(days), estimatedCount)
}

type PartialSystemStatus = Omit<Partial<SystemStatus>, 'database' | 'storage' | 'content' | 'translation' | 'runtime' | 'deployment'> & {
  database?: Partial<SystemStatus['database']>
  storage?: Partial<SystemStatus['storage']>
  content?: Partial<SystemStatus['content']>
  translation?: Partial<SystemStatus['translation']>
  runtime?: Partial<SystemStatus['runtime']>
  deployment?: Partial<SystemStatus['deployment']>
}

export function normalizeSystemStatusPayload(value: PartialSystemStatus): SystemStatus {
  return {
    generatedAt: value.generatedAt ?? new Date(0).toISOString(),
    database: {
      status: value.database?.status ?? 'warning',
      latencyMs: value.database?.latencyMs ?? 0,
      totalConns: value.database?.totalConns ?? 0,
      acquiredConns: value.database?.acquiredConns ?? 0,
      idleConns: value.database?.idleConns ?? 0,
    },
    storage: {
      status: value.storage?.status ?? 'warning',
      uploadDir: value.storage?.uploadDir ?? '',
      exists: value.storage?.exists ?? false,
      writable: value.storage?.writable ?? false,
      fileCount: value.storage?.fileCount ?? 0,
      totalBytes: value.storage?.totalBytes ?? 0,
    },
    content: {
      posts: value.content?.posts ?? 0,
      trashedPosts: value.content?.trashedPosts ?? 0,
      pages: value.content?.pages ?? 0,
      trashedPages: value.content?.trashedPages ?? 0,
      mediaAssets: value.content?.mediaAssets ?? 0,
      comments: value.content?.comments ?? 0,
      users: value.content?.users ?? 0,
      activityLogs: value.content?.activityLogs ?? 0,
      translationCaches: value.content?.translationCaches ?? 0,
      staleTranslationCaches: value.content?.staleTranslationCaches ?? 0,
      translationJobs: value.content?.translationJobs ?? 0,
      runningTranslationJobs: value.content?.runningTranslationJobs ?? 0,
      failedTranslationJobs: value.content?.failedTranslationJobs ?? 0,
    },
    translation: {
      enabled: value.translation?.enabled ?? false,
      provider: value.translation?.provider ?? '-',
      model: value.translation?.model ?? '-',
      apiKeyConfigured: value.translation?.apiKeyConfigured ?? false,
      cacheCount: value.translation?.cacheCount ?? 0,
      staleCacheCount: value.translation?.staleCacheCount ?? 0,
      jobCount: value.translation?.jobCount ?? value.content?.translationJobs ?? 0,
      runningJobCount: value.translation?.runningJobCount ?? value.content?.runningTranslationJobs ?? 0,
      failedJobCount: value.translation?.failedJobCount ?? value.content?.failedTranslationJobs ?? 0,
      supportedLanguages: value.translation?.supportedLanguages ?? [],
    },
    runtime: {
      goVersion: value.runtime?.goVersion ?? '-',
      os: value.runtime?.os ?? '-',
      arch: value.runtime?.arch ?? '-',
      processId: value.runtime?.processId ?? 0,
      startedAt: value.runtime?.startedAt ?? value.generatedAt ?? new Date(0).toISOString(),
      uptimeSeconds: value.runtime?.uptimeSeconds ?? 0,
    },
    deployment: {
      status: value.deployment?.status ?? 'ok',
      checks: value.deployment?.checks ?? [],
    },
  }
}

export function systemChecklist(status: SystemStatus, messages: SystemStatusMessages = defaultSystemStatusMessages, locale = 'zh-CN') {
  const normalized = normalizeSystemStatusPayload(status)
  const trashedTotal = normalized.content.trashedPosts + normalized.content.trashedPages
  return [
    {
      key: 'database',
      label: messages.checklist.database,
      ok: normalized.database.status === 'ok',
      detail: messages.checklist.databaseDetail(normalized.database.latencyMs, normalized.database.acquiredConns, normalized.database.totalConns),
    },
    {
      key: 'storage',
      label: messages.checklist.storage,
      ok: normalized.storage.exists && normalized.storage.writable,
      detail: messages.checklist.storageDetail(normalized.storage.fileCount, formatSystemBytes(normalized.storage.totalBytes, locale)),
    },
    {
      key: 'translation',
      label: messages.checklist.translation,
      ok: !normalized.translation.enabled || normalized.translation.apiKeyConfigured,
      detail: normalized.translation.enabled ? `${normalized.translation.provider} / ${normalized.translation.model}` : messages.checklist.translationDisabled,
    },
    {
      key: 'trash',
      label: messages.checklist.trash,
      ok: trashedTotal === 0,
      detail: trashedTotal === 0 ? messages.checklist.trashOk : messages.checklist.trashPending(trashedTotal),
    },
    {
      key: 'translation-cache',
      label: messages.checklist.translationCache,
      ok: normalized.content.staleTranslationCaches === 0 && normalized.content.failedTranslationJobs === 0,
      detail: messages.checklist.translationCacheDetail(
        normalized.content.translationCaches,
        normalized.content.staleTranslationCaches,
        normalized.content.runningTranslationJobs,
        normalized.content.failedTranslationJobs,
      ),
    },
    {
      key: 'runtime',
      label: messages.checklist.runtime,
      ok: normalized.runtime.goVersion !== '' && normalized.runtime.uptimeSeconds >= 0,
      detail: `${normalized.runtime.goVersion} / ${normalized.runtime.os}/${normalized.runtime.arch} / ${formatUptimeSeconds(normalized.runtime.uptimeSeconds, messages)}`,
    },
    {
      key: 'deployment',
      label: messages.checklist.deployment,
      ok: normalized.deployment.status === 'ok',
      detail:
        normalized.deployment.status === 'ok'
          ? messages.checklist.deploymentOk
          : messages.checklist.deploymentPending(normalized.deployment.checks.filter((check) => !check.ok).length),
    },
  ]
}
