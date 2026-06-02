export const activityActionOptions = [
  'login',
  'logout',
  'login_failed',
  'login_blocked',
  'create',
  'update',
  'delete',
  'upload',
  'moderate',
  'reply',
  'update_profile',
  'update_password',
  'trash',
  'restore',
  'delete_permanent',
  'export',
  'import',
  'delete_old',
  'delete_stale',
  'backfill',
]

export type ActivityAction = (typeof activityActionOptions)[number]

export const activityEntityTypeOptions = [
  'auth',
  'user',
  'post',
  'page',
  'category',
  'tag',
  'comment',
  'media',
  'settings',
  'backup',
  'friend_link',
  'translation_cache',
  'activity_logs',
]

export type ActivityEntityType = (typeof activityEntityTypeOptions)[number]

export type ActivityLogLabelMessages = {
  actions: Record<ActivityAction, string>
  entityTypes: Record<ActivityEntityType, string>
  reasons: Record<string, string>
  reasonPrefix: string
  detailSeparator: string
}

export const defaultActivityLogLabels: ActivityLogLabelMessages = {
  actions: {
    login: '登录',
    logout: '退出',
    login_failed: '登录失败',
    login_blocked: '登录拦截',
    create: '创建',
    update: '更新',
    delete: '删除',
    upload: '上传',
    moderate: '审核',
    reply: '回复',
    update_profile: '资料',
    update_password: '改密',
    trash: '回收',
    restore: '恢复',
    delete_permanent: '彻删',
    export: '导出',
    import: '导入',
    delete_old: '清旧',
    delete_stale: '清缓存',
    backfill: '补齐',
  },
  entityTypes: {
    auth: '认证',
    user: '用户',
    post: '文章',
    page: '页面',
    category: '分类',
    tag: '标签',
    comment: '评论',
    media: '媒体',
    settings: '设置',
    backup: '备份',
    friend_link: '友链',
    translation_cache: '翻译缓存',
    activity_logs: '操作日志',
  },
  reasons: {
    disabled: '账号已停用',
    rate_limited: '失败次数过多',
    invalid_credentials: '用户名或密码错误',
  },
  reasonPrefix: '原因：',
  detailSeparator: '；',
}

export function activityActionLabel(action: string, labels: ActivityLogLabelMessages = defaultActivityLogLabels) {
  return labels.actions[action as ActivityAction] ?? action
}

export function activityEntityTypeLabel(entityType: string, labels: ActivityLogLabelMessages = defaultActivityLogLabels) {
  return labels.entityTypes[entityType as ActivityEntityType] ?? entityType
}

export function activityReasonLabel(reason: string, labels: ActivityLogLabelMessages = defaultActivityLogLabels) {
  return labels.reasons[reason] ?? reason
}

export function activityDetailText(detail: Record<string, unknown> | null | undefined, labels: ActivityLogLabelMessages = defaultActivityLogLabels) {
  if (!detail || Object.keys(detail).length === 0) return ''
  return Object.entries(detail)
    .map(([key, value]) => {
      if (key === 'reason' && typeof value === 'string') {
        return `${labels.reasonPrefix}${activityReasonLabel(value, labels)}`
      }
      return `${key}: ${formatDetailValue(value)}`
    })
    .join(labels.detailSeparator)
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
