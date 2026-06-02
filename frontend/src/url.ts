export function toAbsoluteUrl(value?: string | null, baseUrl?: string | null) {
  const cleaned = value?.trim() ?? ''
  if (!cleaned) return ''
  try {
    return new URL(cleaned).toString()
  } catch {
    const base = baseUrl?.trim()
    if (!base) return cleaned
    try {
      return new URL(cleaned, base).toString()
    } catch {
      return cleaned
    }
  }
}
