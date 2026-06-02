import type { User, UserInput } from './types'

export type UserRoleFilterValue = '' | UserInput['role']
export type UserStatusFilterValue = '' | UserInput['status']

export const userRoleOptions: Array<{ value: UserRoleFilterValue; label: string }> = [
  { value: '', label: '全部角色' },
  { value: 'admin', label: '管理员' },
  { value: 'editor', label: '编辑' },
]

export const userStatusOptions: Array<{ value: UserStatusFilterValue; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '启用' },
  { value: 'disabled', label: '停用' },
]

export function userRoleLabel(role: string) {
  if (role === 'admin') return '管理员'
  if (role === 'editor') return '编辑'
  return '未知角色'
}

export function userStatusLabel(status: string) {
  return status === 'disabled' ? '停用' : '启用'
}

export function selectableUserIds(users: Array<Pick<User, 'id'>>, currentUserId?: string | null) {
  return users.map((user) => user.id).filter((id) => Boolean(id) && id !== currentUserId)
}

export function selectedUsersForBulkAction<T extends Pick<User, 'id'>>(
  selectedIds: string[],
  users: T[],
  currentUserId?: string | null,
) {
  const userById = new Map(users.map((user) => [user.id, user]))
  return selectedIds
    .map((id) => userById.get(id))
    .filter((user): user is T => user !== undefined && Boolean(user.id) && user.id !== currentUserId)
}
