import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { activityActionLabel, activityActionOptions, activityDetailText, activityEntityTypeLabel, activityEntityTypeOptions, activityReasonLabel } from './activityLogs.js'
import { activityLogsPageUIText } from './activityLogsPageI18n.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(activityActionLabel('login'), '登录', 'login action label')
assertEqual(activityActionLabel('logout'), '退出', 'logout action label')
assertEqual(activityActionLabel('login_failed'), '登录失败', 'login failed action label')
assertEqual(activityActionLabel('login_blocked'), '登录拦截', 'login blocked action label')
assertEqual(activityActionLabel('backfill'), '补齐', 'backfill action label')
assertEqual(activityActionLabel('delete_stale'), '清缓存', 'delete stale action label')
assertEqual(activityActionLabel('reply'), '回复', 'reply action label')
assertEqual(activityActionLabel('unknown_action'), 'unknown_action', 'unknown action fallback')

assertEqual(activityReasonLabel('disabled'), '账号已停用', 'disabled reason')
assertEqual(activityReasonLabel('rate_limited'), '失败次数过多', 'rate limited reason')
assertEqual(activityReasonLabel('invalid_credentials'), '用户名或密码错误', 'invalid credentials reason')
assertEqual(activityReasonLabel('custom_reason'), 'custom_reason', 'unknown reason fallback')

assertEqual(activityEntityTypeLabel('auth'), '认证', 'auth entity label')
assertEqual(activityEntityTypeLabel('friend_link'), '友链', 'friend link entity label')
assertEqual(activityEntityTypeLabel('translation_cache'), '翻译缓存', 'translation cache entity label')
assertEqual(activityEntityTypeLabel('activity_logs'), '操作日志', 'activity logs entity label')
assertEqual(activityEntityTypeLabel('custom'), 'custom', 'unknown entity fallback')

assertEqual(activityDetailText({ reason: 'rate_limited', username: 'admin' }), '原因：失败次数过多；username: admin', 'formats translated reason detail')
assertEqual(activityDetailText({ title: '文章', status: 'draft' }), 'title: 文章；status: draft', 'formats generic detail')
assertEqual(activityDetailText({}), '', 'empty detail')

const english = activityLogsPageUIText('en')
assertEqual(activityActionLabel('login_blocked', english.logLabels), 'Login blocked', 'localized action label')
assertEqual(activityActionLabel('logout', english.logLabels), 'Log out', 'localized logout action label')
assertEqual(activityActionLabel('reply', english.logLabels), 'Reply', 'localized reply action label')
assertEqual(activityEntityTypeLabel('translation_cache', english.logLabels), 'Translation cache', 'localized entity label')
assertEqual(activityDetailText({ reason: 'invalid_credentials' }, english.logLabels), 'Reason: Invalid username or password', 'localized detail reason')

for (const code of ['zh-CN', 'zh-TW', 'en', 'ja', 'fr', 'hi', 'es', 'ar', 'ru', 'pt', 'eo']) {
  const labels = activityLogsPageUIText(code).logLabels
  for (const action of activityActionOptions) {
    if (!labels.actions[action]) {
      throw new Error(`missing ${code} activity action label for ${action}`)
    }
  }
  for (const entityType of activityEntityTypeOptions) {
    if (!labels.entityTypes[entityType]) {
      throw new Error(`missing ${code} activity entity type label for ${entityType}`)
    }
  }
}

const backendActions = new Set<string>()
const backendEntityTypes = new Set<string>()
const backendApiDir = join('..', 'backend', 'internal', 'api')
for (const entry of readdirSync(backendApiDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.go')) continue
  const source = readFileSync(join(backendApiDir, entry.name), 'utf8')
  for (const match of source.matchAll(/logAdminAction\(r,\s*"([^"]+)",\s*"([^"]+)"/g)) {
    backendActions.add(match[1])
    backendEntityTypes.add(match[2])
  }
}
for (const action of backendActions) {
  if (!activityActionOptions.includes(action as (typeof activityActionOptions)[number])) {
    throw new Error(`backend activity action ${action} is missing from frontend activityActionOptions`)
  }
}
for (const entityType of backendEntityTypes) {
  if (!activityEntityTypeOptions.includes(entityType as (typeof activityEntityTypeOptions)[number])) {
    throw new Error(`backend activity entity type ${entityType} is missing from frontend activityEntityTypeOptions`)
  }
}
