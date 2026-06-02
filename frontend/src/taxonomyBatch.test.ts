import { parseTaxonomyBatchInput } from './taxonomyBatch.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

function assertArray(actual: string[], expected: string[], label: string) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label)
}

assertArray(
  parseTaxonomyBatchInput('前端\n后端，数据库、运维; AI；增长').names,
  ['前端', '后端', '数据库', '运维', 'AI', '增长'],
  'splits common Chinese content separators',
)

assertArray(
  parseTaxonomyBatchInput('  React  , react, React,,  Go  ').names,
  ['React', 'Go'],
  'trims, drops empty names, and deduplicates case-insensitively',
)

const limited = parseTaxonomyBatchInput(Array.from({ length: 55 }, (_, index) => `标签${index + 1}`).join('、'))
assertEqual(String(limited.names.length), '50', 'caps parsed names at the default limit')
assertEqual(String(limited.overflow), '5', 'reports overflow count')

const customLimit = parseTaxonomyBatchInput('A,B,C', 2)
assertArray(customLimit.names, ['A', 'B'], 'honors custom limit')
assertEqual(String(customLimit.overflow), '1', 'reports custom overflow')
