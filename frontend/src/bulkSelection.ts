function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)))
}

export function toggleSelection(selectedIds: string[], id: string) {
  if (!id) return uniqueIds(selectedIds)
  if (selectedIds.includes(id)) {
    return selectedIds.filter((selectedId) => selectedId !== id)
  }
  return [...uniqueIds(selectedIds), id]
}

export function togglePageSelection(selectedIds: string[], pageIds: string[], checked: boolean) {
  const uniquePageIds = uniqueIds(pageIds)
  if (!checked) {
    const pageIdSet = new Set(uniquePageIds)
    return uniqueIds(selectedIds).filter((id) => !pageIdSet.has(id))
  }
  return uniqueIds([...selectedIds, ...uniquePageIds])
}

export function countSelectedInPage(selectedIds: string[], pageIds: string[]) {
  const selected = new Set(selectedIds)
  return uniqueIds(pageIds).filter((id) => selected.has(id)).length
}
