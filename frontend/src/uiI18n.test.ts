import { supportedLanguages } from './i18n.js'
import { archiveMonthLabel, documentDirectionForLanguage, publicPageUIText, publicUIText } from './uiI18n.js'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: got ${String(actual)}, want ${String(expected)}`)
  }
}

for (const language of supportedLanguages) {
  const text = publicUIText(language.code)
  if (!text.app.searchPlaceholder || !text.app.languageLabel || !text.app.loading || !text.app.rss || !text.app.poweredBy || !text.home.all || !text.post.copyLink || !text.post.tableOfContents) {
    throw new Error(`missing public UI text for ${language.code}`)
  }
  const pageText = publicPageUIText(language.code)
  if (!pageText.archives.title || !pageText.links.title || !pageText.links.initialFallback || !pageText.taxonomy.allPosts || !pageText.page.customPage) {
    throw new Error(`missing public page UI text for ${language.code}`)
  }
}

assertEqual(publicUIText('en').app.searchPlaceholder, 'Search posts, notes, keywords', 'English search placeholder')
assertEqual(publicUIText('en').app.loading, 'Loading', 'English loading label')
assertEqual(publicUIText('en').app.navArchives, 'Archives', 'English archives nav')
assertEqual(publicUIText('en').app.rss, 'RSS Feed', 'English RSS label')
assertEqual(publicUIText('en').app.poweredBy, 'Powered by React, Go, PostgreSQL, and Docker.', 'English footer powered-by label')
assertEqual(publicUIText('en').post.translating, 'Loading cached translation', 'English translation loading label')
assertEqual(publicUIText('zh-TW').home.all, '全部', 'Traditional Chinese home all label')
assertEqual(publicUIText('ja').post.copyLink, 'リンクをコピー', 'Japanese copy link')
assertEqual(publicUIText('ja').post.tableOfContents, '目次', 'Japanese table of contents')
assertEqual(publicUIText('ar').post.commentsClosed, 'تم إغلاق التعليقات العامة، ولا تزال التعليقات السابقة قابلة للقراءة.', 'Arabic comments closed')
assertEqual(publicUIText('pt-BR').home.contentHub, 'Central de conteúdo pessoal', 'Portuguese browser locale fallback')
assertEqual(publicPageUIText('en').archives.title, 'Archives', 'English archives title')
assertEqual(publicPageUIText('zh-CN').links.initialFallback, '友', 'Simplified Chinese link initial fallback')
assertEqual(publicPageUIText('en').links.initialFallback, 'L', 'English link initial fallback')
assertEqual(publicPageUIText('ar').links.contactOwner, 'تواصل مع الكاتب', 'Arabic contact owner')
assertEqual(publicPageUIText('ja').taxonomy.empty, 'このトピックにはまだ記事がありません', 'Japanese taxonomy empty')
assertEqual(archiveMonthLabel('en', 6), 'June', 'English month label')
assertEqual(archiveMonthLabel('zh-CN', 6), '6月', 'Chinese month label')
assertEqual(archiveMonthLabel('en', 13), 'Unknown month', 'Unknown month fallback')
assertEqual(documentDirectionForLanguage('ar'), 'rtl', 'Arabic document direction')
assertEqual(documentDirectionForLanguage('en-US'), 'ltr', 'English document direction')
