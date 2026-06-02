import { updatePostFilterParams } from './postFilters.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${actual}, want ${expected}`)
  }
}

const withCategory = updatePostFilterParams(new URLSearchParams('q=Go&page=3&status=published'), 'category', 'tech')
assertEqual(withCategory.toString(), 'q=Go&status=published&category=tech', 'sets category and resets page')

const withTag = updatePostFilterParams(new URLSearchParams('category=tech&deleted=1'), 'tag', 'react')
assertEqual(withTag.toString(), 'category=tech&deleted=1&tag=react', 'sets tag and preserves existing filters')

const withoutCategory = updatePostFilterParams(new URLSearchParams('category=tech&tag=react&page=2'), 'category', '')
assertEqual(withoutCategory.toString(), 'tag=react', 'removes empty category and resets page')

const scheduled = updatePostFilterParams(new URLSearchParams('status=published&page=4'), 'scheduled', '1')
assertEqual(scheduled.toString(), 'status=published&scheduled=1', 'sets scheduled filter and resets page')

const withoutScheduled = updatePostFilterParams(new URLSearchParams('status=published&scheduled=1&page=2'), 'scheduled', '')
assertEqual(withoutScheduled.toString(), 'status=published', 'removes scheduled filter and resets page')

const featured = updatePostFilterParams(new URLSearchParams('q=CMS&page=5'), 'featured', '1')
assertEqual(featured.toString(), 'q=CMS&featured=1', 'sets featured filter and resets page')

const withoutFeatured = updatePostFilterParams(new URLSearchParams('featured=1&status=published&page=2'), 'featured', '')
assertEqual(withoutFeatured.toString(), 'status=published', 'removes featured filter and resets page')
