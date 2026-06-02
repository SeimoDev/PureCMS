import { normalizeLanguageCode } from './i18n.js'
import type { FriendLink } from './types.js'

export type FriendLinksPageUIText = {
  title: string
  subtitle: string
  loading: string
  loadError: string
  createdNotice: string
  createError: string
  savedNotice: string
  saveError: string
  deleteConfirm: (name: string) => string
  deletedNotice: string
  deleteError: string
  updateFailure: string
  deleteFailure: string
  failureDetail: (name: string, message: string) => string
  moreFailures: string
  failureSeparator: string
  bulkUpdateFailure: (updated: number, failures: number, detail: string, more: string) => string
  bulkStatusNotice: (updated: number, status: string) => string
  bulkDeleteConfirm: (count: number) => string
  bulkDeleteFailure: (deleted: number, failures: number, detail: string, more: string) => string
  bulkDeleteNotice: (deleted: number) => string
  newTitle: string
  name: string
  url: string
  sortOrder: string
  description: string
  createLink: string
  searchPlaceholder: string
  all: (total: number) => string
  activeFilter: (total: number) => string
  hiddenFilter: (total: number) => string
  bulkTitle: string
  bulkSelected: (selected: number, filtered: number) => string
  setActive: string
  setHidden: string
  bulkDelete: string
  clear: string
  empty: string
  emptyFiltered: string
  emptyDescription: string
  emptyFilteredDescription: string
  openLink: string
  saveLink: string
  deleteLink: string
  status: string
  statusLabels: Record<FriendLink['status'], string>
  locale: string
}

const zhCN: FriendLinksPageUIText = {
  title: '友情链接',
  subtitle: '维护中文个人站常见的友链入口，可公开展示或临时隐藏',
  loading: '读取友情链接',
  loadError: '读取友链失败',
  createdNotice: '友链已创建。',
  createError: '创建友链失败',
  savedNotice: '友链已保存。',
  saveError: '保存友链失败',
  deleteConfirm: (name) => `确认删除友链「${name}」？`,
  deletedNotice: '友链已删除。',
  deleteError: '删除友链失败',
  updateFailure: '更新失败',
  deleteFailure: '删除失败',
  failureDetail: (name, message) => `${name}：${message}`,
  moreFailures: ' 等',
  failureSeparator: '、',
  bulkUpdateFailure: (updated, failures, detail, more) => `已更新 ${updated} 个友链，${failures} 个失败：${detail}${more}`,
  bulkStatusNotice: (updated, status) => `已将 ${updated} 个友链设为${status}。`,
  bulkDeleteConfirm: (count) => `确认删除已选的 ${count} 个友链？`,
  bulkDeleteFailure: (deleted, failures, detail, more) => `已删除 ${deleted} 个友链，${failures} 个失败：${detail}${more}`,
  bulkDeleteNotice: (deleted) => `已删除 ${deleted} 个友链。`,
  newTitle: '新建友链',
  name: '名称',
  url: '网址',
  sortOrder: '排序',
  description: '描述',
  createLink: '新建友链',
  searchPlaceholder: '搜索名称、网址或描述',
  all: (total) => `全部 ${total}`,
  activeFilter: (total) => `公开 ${total}`,
  hiddenFilter: (total) => `隐藏 ${total}`,
  bulkTitle: '批量友链管理',
  bulkSelected: (selected, filtered) => `已选择 ${selected} 个，筛选结果 ${filtered} 个`,
  setActive: '设为公开',
  setHidden: '设为隐藏',
  bulkDelete: '批量删除',
  clear: '清空',
  empty: '暂无友情链接',
  emptyFiltered: '没有匹配的友链',
  emptyDescription: '添加常读博客、项目主页或合作站点后，会显示在前台页脚。',
  emptyFilteredDescription: '调整搜索词或状态筛选后再查看。',
  openLink: '打开友链',
  saveLink: '保存友链',
  deleteLink: '删除友链',
  status: '状态',
  statusLabels: { active: '公开', hidden: '隐藏' },
  locale: 'zh-CN',
}

const en: FriendLinksPageUIText = {
  title: 'Friend Links',
  subtitle: 'Manage blogroll entries for the public site footer, with public or hidden visibility',
  loading: 'Loading friend links',
  loadError: 'Failed to load friend links',
  createdNotice: 'Friend link created.',
  createError: 'Failed to create friend link',
  savedNotice: 'Friend link saved.',
  saveError: 'Failed to save friend link',
  deleteConfirm: (name) => `Delete friend link "${name}"?`,
  deletedNotice: 'Friend link deleted.',
  deleteError: 'Failed to delete friend link',
  updateFailure: 'Update failed',
  deleteFailure: 'Delete failed',
  failureDetail: (name, message) => `${name}: ${message}`,
  moreFailures: ' and more',
  failureSeparator: '; ',
  bulkUpdateFailure: (updated, failures, detail, more) => `Updated ${updated} friend links, ${failures} failed: ${detail}${more}`,
  bulkStatusNotice: (updated, status) => `${updated} friend links set to ${status}.`,
  bulkDeleteConfirm: (count) => `Delete ${count} selected friend links?`,
  bulkDeleteFailure: (deleted, failures, detail, more) => `Deleted ${deleted} friend links, ${failures} failed: ${detail}${more}`,
  bulkDeleteNotice: (deleted) => `${deleted} friend links deleted.`,
  newTitle: 'New friend link',
  name: 'Name',
  url: 'URL',
  sortOrder: 'Sort order',
  description: 'Description',
  createLink: 'Create friend link',
  searchPlaceholder: 'Search name, URL, or description',
  all: (total) => `All ${total}`,
  activeFilter: (total) => `Public ${total}`,
  hiddenFilter: (total) => `Hidden ${total}`,
  bulkTitle: 'Bulk friend link management',
  bulkSelected: (selected, filtered) => `${selected} selected, ${filtered} filtered`,
  setActive: 'Set public',
  setHidden: 'Set hidden',
  bulkDelete: 'Delete selected',
  clear: 'Clear',
  empty: 'No friend links yet',
  emptyFiltered: 'No matching friend links',
  emptyDescription: 'Blogs, project pages, or partner sites will appear in the public footer after you add them.',
  emptyFilteredDescription: 'Adjust the search term or status filter and try again.',
  openLink: 'Open friend link',
  saveLink: 'Save friend link',
  deleteLink: 'Delete friend link',
  status: 'Status',
  statusLabels: { active: 'Public', hidden: 'Hidden' },
  locale: 'en',
}

const zhTW: FriendLinksPageUIText = {
    ...zhCN,
    title: '友情連結',
    subtitle: '維護中文個人站常見的友鏈入口，可公開展示或暫時隱藏',
    loading: '讀取友情連結',
    loadError: '讀取友鏈失敗',
    createdNotice: '友鏈已建立。',
    createError: '建立友鏈失敗',
    savedNotice: '友鏈已儲存。',
    saveError: '儲存友鏈失敗',
    deleteConfirm: (name) => `確認刪除友鏈「${name}」？`,
    deletedNotice: '友鏈已刪除。',
    updateFailure: '更新失敗',
    deleteFailure: '刪除失敗',
    newTitle: '新建友鏈',
    name: '名稱',
    url: '網址',
    sortOrder: '排序',
    description: '描述',
    searchPlaceholder: '搜尋名稱、網址或描述',
    all: (total) => `全部 ${total}`,
    activeFilter: (total) => `公開 ${total}`,
    hiddenFilter: (total) => `隱藏 ${total}`,
    setActive: '設為公開',
    setHidden: '設為隱藏',
    empty: '暫無友情連結',
    emptyFiltered: '沒有符合的友鏈',
    statusLabels: { active: '公開', hidden: '隱藏' },
    locale: 'zh-TW',
}

const textByLanguage: Record<string, FriendLinksPageUIText> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja: variant('リンク', '公開', '非表示', 'ja'),
  fr: variant('Liens amis', 'Public', 'Masqué', 'fr'),
  hi: variant('मित्र लिंक', 'सार्वजनिक', 'छिपा हुआ', 'hi'),
  es: variant('Enlaces amigos', 'Público', 'Oculto', 'es'),
  ar: variant('روابط الأصدقاء', 'عام', 'مخفي', 'ar'),
  ru: variant('Дружественные ссылки', 'Публично', 'Скрыто', 'ru'),
  pt: variant('Links amigos', 'Público', 'Oculto', 'pt'),
  eo: variant('Amikaj ligiloj', 'Publika', 'Kaŝita', 'eo'),
}

function variant(title: string, active: string, hidden: string, locale: string): FriendLinksPageUIText {
  return {
    ...en,
    title,
    statusLabels: { active, hidden },
    activeFilter: (total) => `${active} ${total}`,
    hiddenFilter: (total) => `${hidden} ${total}`,
    locale,
  }
}

export function friendLinksPageUIText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return textByLanguage[code] ?? textByLanguage['zh-CN']
}
