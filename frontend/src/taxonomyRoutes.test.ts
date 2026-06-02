import { findTaxonomyItem, taxonomyDescription, taxonomyPath, taxonomyTitle } from './taxonomyRoutes.js'
import type { Category, Tag } from './types.js'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const techNotes = '\u6280\u672f\u624b\u8bb0'
const techDescription = 'React\u3001Go \u548c\u5de5\u7a0b\u5b9e\u8df5'

const categories: Category[] = [
  {
    id: 'cat-1',
    name: techNotes,
    slug: 'tech-notes',
    description: techDescription,
    sortOrder: 1,
    postCount: 12,
    referenceCount: 12,
    createdAt: '2026-06-01T00:00:00Z',
  },
]

const tags: Tag[] = [
  {
    id: 'tag-1',
    name: 'Go',
    slug: 'go',
    postCount: 5,
    referenceCount: 5,
    createdAt: '2026-06-01T00:00:00Z',
  },
]

assertEqual(taxonomyPath('category', 'tech-notes'), '/categories/tech-notes', 'category path')
assertEqual(taxonomyPath('tag', 'go'), '/tags/go', 'tag path')
assertEqual(findTaxonomyItem('category', 'tech-notes', categories, tags)?.name ?? '', techNotes, 'finds category')
assertEqual(findTaxonomyItem('tag', 'go', categories, tags)?.name ?? '', 'Go', 'finds tag')

assertEqual(taxonomyTitle('category', categories[0]), `\u5206\u7c7b\uff1a${techNotes}`, 'default category title')
assertEqual(taxonomyTitle('tag', tags[0]), '\u6807\u7b7e\uff1aGo', 'default tag title')
assertEqual(taxonomyDescription('category', categories[0]), techDescription, 'category description')
assertEqual(taxonomyDescription('tag', tags[0]), '\u6d4f\u89c8Go\u6807\u7b7e\u4e0b\u7684\u6587\u7ae0\u3002', 'default tag description')

assertEqual(taxonomyTitle('category', categories[0], 'en-US'), `Category: ${techNotes}`, 'english category title')
assertEqual(taxonomyTitle('tag', tags[0], 'en'), 'Tag: Go', 'english tag title')
assertEqual(taxonomyDescription('tag', tags[0], 'en'), 'Browse posts tagged Go.', 'english tag description')
assertEqual(taxonomyDescription('category', undefined, 'en'), 'No posts in this topic yet', 'english empty description')

assertEqual(taxonomyTitle('tag', tags[0], 'ar'), '\u0648\u0633\u0645: Go', 'arabic tag title')
