import {
  selectableUserIds,
  selectedUsersForBulkAction,
  userRoleLabel,
  userRoleOptions,
  userStatusLabel,
  userStatusOptions,
} from './users.js'
import type { User } from './types.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(userRoleLabel('admin'), '管理员', 'admin role label')
assertEqual(userRoleLabel('editor'), '编辑', 'editor role label')
assertEqual(userRoleLabel('unknown'), '未知角色', 'unknown role label')
assertEqual(userStatusLabel('active'), '启用', 'active status label')
assertEqual(userStatusLabel('disabled'), '停用', 'disabled status label')

assertEqual(userRoleOptions.map((option) => option.value).join(','), ',admin,editor', 'role option order')
assertEqual(userStatusOptions.map((option) => option.value).join(','), ',active,disabled', 'status option order')
assertEqual(
  selectableUserIds([{ id: 'u-1' }, { id: 'u-2' }, { id: '' }], 'u-1').join(','),
  'u-2',
  'selectable user ids exclude current user and empty ids',
)

const users: User[] = [
  {
    id: 'u-1',
    username: 'owner',
    displayName: 'Owner',
    role: 'admin',
    status: 'active',
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-2',
    username: 'editor',
    displayName: 'Editor',
    role: 'editor',
    status: 'active',
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-3',
    username: 'disabled',
    displayName: 'Disabled',
    role: 'editor',
    status: 'disabled',
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

assertEqual(
  selectedUsersForBulkAction(['u-3', 'missing', 'u-1', 'u-2'], users, 'u-1')
    .map((user) => user.id)
    .join(','),
  'u-3,u-2',
  'bulk targets keep selected order while excluding missing and current user',
)
