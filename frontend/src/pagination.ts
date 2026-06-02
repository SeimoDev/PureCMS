export function pageCount(total: number, limit: number) {
  if (total <= 0 || limit <= 0) return 1
  return Math.max(1, Math.ceil(total / limit))
}

export function clampPage(page: number, pages: number) {
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(page, Math.max(1, pages))
}
