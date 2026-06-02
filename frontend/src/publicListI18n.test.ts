import { readFileSync } from 'node:fs'

function assertIncludes(source: string, fragment: string, label: string) {
  if (!source.includes(fragment)) {
    throw new Error(`${label}: missing ${fragment}`)
  }
}

const home = readFileSync('src/pages/PublicHomePage.tsx', 'utf8')
assertIncludes(home, 'lang: selectedLanguage', 'home post list should request selected language')
assertIncludes(home, 'selectedLanguage, selectedTag', 'home post list should reload when selected language changes')

const taxonomy = readFileSync('src/pages/PublicTaxonomyPage.tsx', 'utf8')
assertIncludes(taxonomy, 'lang: selectedLanguage', 'taxonomy post list should request selected language')
assertIncludes(taxonomy, 'query, selectedLanguage, slug', 'taxonomy post list should reload when selected language changes')

const archives = readFileSync('src/pages/PublicArchivesPage.tsx', 'utf8')
assertIncludes(archives, 'api\n      .archives({ lang: selectedLanguage })', 'archives should request selected language')
assertIncludes(archives, '[selectedLanguage, ui.archives.loadFailed]', 'archives should reload when selected language changes')
