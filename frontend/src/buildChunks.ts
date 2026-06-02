export function cmsManualChunk(id: string) {
  const normalized = id.replaceAll('\\', '/')
  if (!normalized.includes('/node_modules/')) return undefined
  if (
    normalized.includes('/@mui/') ||
    normalized.includes('/@emotion/') ||
    normalized.includes('/@popperjs/') ||
    normalized.includes('/react-transition-group/')
  ) {
    return 'mui-vendor'
  }
  if (
    normalized.includes('/node_modules/react/') ||
    normalized.includes('/node_modules/react-dom/') ||
    normalized.includes('/node_modules/scheduler/')
  ) {
    return 'react-vendor'
  }
  if (normalized.includes('/lucide-react/')) {
    return 'icon-vendor'
  }
  return 'vendor'
}
