import { countSelectedInPage, togglePageSelection, toggleSelection } from './bulkSelection'

export function toggleCommentSelection(selectedIds: string[], id: string) {
  return toggleSelection(selectedIds, id)
}

export function toggleCommentPageSelection(selectedIds: string[], pageIds: string[], checked: boolean) {
  return togglePageSelection(selectedIds, pageIds, checked)
}

export function countSelectedCommentsInPage(selectedIds: string[], pageIds: string[]) {
  return countSelectedInPage(selectedIds, pageIds)
}
