export function friendLinkDisplayHost(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('mailto:')) return trimmed.slice('mailto:'.length)
  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).hostname
  } catch {
    return trimmed
  }
}

export function friendLinkInitial(name: string, fallback = '友') {
	const first = name.trim().charAt(0)
	return first ? first.toUpperCase() : fallback
}
