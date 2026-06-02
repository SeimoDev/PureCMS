export const TAXONOMY_BATCH_LIMIT = 50

export type TaxonomyBatchParseResult = {
  names: string[]
  overflow: number
}

const taxonomySeparator = /[\r\n,，;；、]+/

export function parseTaxonomyBatchInput(input: string, limit = TAXONOMY_BATCH_LIMIT): TaxonomyBatchParseResult {
  const safeLimit = Math.max(0, Math.floor(limit))
  const names: string[] = []
  const seen = new Set<string>()

  input.split(taxonomySeparator).forEach((rawName) => {
    const name = rawName.trim()
    const key = name.toLocaleLowerCase()
    if (!name || seen.has(key)) return
    seen.add(key)
    names.push(name)
  })

  return {
    names: names.slice(0, safeLimit),
    overflow: Math.max(0, names.length - safeLimit),
  }
}
