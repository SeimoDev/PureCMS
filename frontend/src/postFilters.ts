export type PostFilterKey = 'category' | 'tag' | 'status' | 'deleted' | 'scheduled' | 'featured' | 'q'

export function updatePostFilterParams(current: URLSearchParams, key: PostFilterKey, value: string) {
  const params = new URLSearchParams(current)
  const normalized = value.trim()
  if (normalized) {
    params.set(key, normalized)
  } else {
    params.delete(key)
  }
  params.delete('page')
  return params
}
