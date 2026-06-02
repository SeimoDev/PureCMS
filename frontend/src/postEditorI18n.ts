import { normalizeLanguageCode } from './i18n.js'

export type MarkdownToolbarText = {
  h2: string
  bold: string
  quote: string
  ul: string
  ol: string
  link: string
  code: string
  table: string
  linePlaceholder: string
  boldPlaceholder: string
  linkPlaceholder: string
  codePlaceholder: string
  tableTemplate: string
}

export type PostEditorUIText = {
  editTitle: string
  newTitle: string
  subtitle: string
  preview: string
  save: string
  savedDraftAt: (value: string) => string
  foundLocalDraft: (value: string) => string
  restore: string
  clear: string
  localDraftRestored: string
  localDraftCleared: string
  loadError: string
  loading: string
  saveSuccess: string
  saveError: string
  restoreConfirm: (version: number) => string
  restoreSuccess: (version: number) => string
  restoreError: string
  justNow: string
  title: string
  slug: string
  slugPlaceholder: string
  excerpt: string
  content: string
  status: string
  draft: string
  published: string
  archived: string
  sourceLanguage: string
  sourceLanguageHelper: string
  publishedAt: string
  publishHelperPublished: string
  publishHelperHidden: string
  scheduledNotice: string
  featured: string
  coverUrl: string
  chooseCover: string
  mediaTitle: string
  mediaSubtitle: string
  openMediaLibrary: string
  noImages: string
  cover: string
  insert: string
  categories: string
  tags: string
  selectionSeparator: string
  seo: string
  seoTitle: string
  seoDescription: string
  revisions: string
  revisionsSubtitle: string
  noRevisions: string
  coverSelected: string
  contentInserted: string
  mediaUploaded: string
  uploadMediaError: string
  chooseCoverDialog: string
  insertMediaDialog: string
  uploadImage: string
  noFileSelected: string
  altText: string
  upload: string
  uploading: string
  mediaSearchPlaceholder: string
  noMatchedImages: string
  setAsCover: string
  insertIntoContent: string
  close: string
  toolbar: MarkdownToolbarText
  locale: string
}

const zhCN: PostEditorUIText = {
  editTitle: '编辑文章',
  newTitle: '新建文章',
  subtitle: '正文、封面、分类标签、SEO、媒体和版本历史',
  preview: '预览',
  save: '保存',
  savedDraftAt: (value) => `本地草稿 ${value} 已保存`,
  foundLocalDraft: (value) => `发现 ${value} 的本地自动草稿。`,
  restore: '恢复',
  clear: '清除',
  localDraftRestored: '已恢复本地自动草稿。',
  localDraftCleared: '已清除本地自动草稿。',
  loadError: '读取编辑数据失败',
  loading: '读取文章',
  saveSuccess: '文章已保存，并生成新的版本快照。',
  saveError: '保存失败',
  restoreConfirm: (version) => `确认恢复到版本 ${version}？当前内容会生成新的快照。`,
  restoreSuccess: (version) => `已恢复到版本 ${version}。`,
  restoreError: '恢复失败',
  justNow: '刚刚',
  title: '标题',
  slug: '固定链接',
  slugPlaceholder: '留空则自动生成',
  excerpt: '摘要',
  content: '正文',
  status: '状态',
  draft: '草稿',
  published: '发布',
  archived: '归档',
  sourceLanguage: '编写语言',
  sourceLanguageHelper: '默认使用简体中文；文章发布后后台会按内置语言自动翻译并缓存。',
  publishedAt: '发布时间',
  publishHelperPublished: '留空则立即发布；选择未来时间则定时公开。',
  publishHelperHidden: '草稿和归档不会出现在前台。',
  scheduledNotice: '这篇文章会在设定时间到达后自动出现在前台、RSS 和 sitemap 中。',
  featured: '精选文章',
  coverUrl: '封面图 URL',
  chooseCover: '从媒体库选择封面',
  mediaTitle: '媒体选择',
  mediaSubtitle: '搜索媒体库、上传图片，并插入到正文或设置为封面。',
  openMediaLibrary: '打开媒体库',
  noImages: '媒体库暂无图片。',
  cover: '封面',
  insert: '插入',
  categories: '分类',
  tags: '标签',
  selectionSeparator: '、',
  seo: 'SEO',
  seoTitle: 'SEO 标题',
  seoDescription: 'SEO 描述',
  revisions: '版本历史',
  revisionsSubtitle: '每次保存都会生成快照，可随时恢复。',
  noRevisions: '暂无版本。',
  coverSelected: '已设置为封面图。',
  contentInserted: '已插入正文。',
  mediaUploaded: '媒体已上传，可直接选择使用。',
  uploadMediaError: '上传媒体失败',
  chooseCoverDialog: '选择封面图',
  insertMediaDialog: '插入媒体图片',
  uploadImage: '上传图片',
  noFileSelected: '未选择文件',
  altText: '替代文本',
  upload: '上传',
  uploading: '上传中',
  mediaSearchPlaceholder: '搜索文件名、替代文本或 URL',
  noMatchedImages: '没有匹配的图片。',
  setAsCover: '设为封面',
  insertIntoContent: '插入正文',
  close: '关闭',
  toolbar: {
    h2: '二级标题',
    bold: '加粗',
    quote: '引用',
    ul: '无序列表',
    ol: '有序列表',
    link: '链接',
    code: '代码块',
    table: '表格',
    linePlaceholder: '内容',
    boldPlaceholder: '重点文字',
    linkPlaceholder: '链接文字',
    codePlaceholder: 'code',
    tableTemplate: '| 列名 | 说明 |\n| --- | --- |\n| 示例 | 内容 |',
  },
  locale: 'zh-CN',
}

const zhTW: PostEditorUIText = {
  ...zhCN,
  editTitle: '編輯文章',
  newTitle: '新增文章',
  subtitle: '正文、封面、分類標籤、SEO、媒體和版本歷史',
  preview: '預覽',
  save: '儲存',
  savedDraftAt: (value) => `本機草稿 ${value} 已儲存`,
  foundLocalDraft: (value) => `發現 ${value} 的本機自動草稿。`,
  restore: '還原',
  clear: '清除',
  localDraftRestored: '已還原本機自動草稿。',
  localDraftCleared: '已清除本機自動草稿。',
  loadError: '讀取編輯資料失敗',
  loading: '讀取文章',
  saveSuccess: '文章已儲存，並產生新的版本快照。',
  saveError: '儲存失敗',
  restoreConfirm: (version) => `確認還原到版本 ${version}？目前內容會產生新的快照。`,
  restoreSuccess: (version) => `已還原到版本 ${version}。`,
  restoreError: '還原失敗',
  title: '標題',
  slug: '固定連結',
  slugPlaceholder: '留空則自動產生',
  excerpt: '摘要',
  status: '狀態',
  archived: '封存',
  sourceLanguage: '撰寫語言',
  sourceLanguageHelper: '預設使用簡體中文；文章發布後後台會依內建語言自動翻譯並快取。',
  publishedAt: '發布時間',
  publishHelperPublished: '留空則立即發布；選擇未來時間則定時公開。',
  publishHelperHidden: '草稿和封存不會出現在前台。',
  scheduledNotice: '這篇文章會在設定時間到達後自動出現在前台、RSS 和 sitemap 中。',
  featured: '精選文章',
  chooseCover: '從媒體庫選擇封面',
  mediaTitle: '媒體選擇',
  openMediaLibrary: '開啟媒體庫',
  revisions: '版本歷史',
  noRevisions: '暫無版本。',
  close: '關閉',
  locale: 'zh-TW',
}

const en: PostEditorUIText = {
  ...zhCN,
  editTitle: 'Edit Post',
  newTitle: 'New Post',
  subtitle: 'Content, cover, taxonomy, SEO, media, and revision history',
  preview: 'Preview',
  save: 'Save',
  savedDraftAt: (value) => `Local draft saved at ${value}`,
  foundLocalDraft: (value) => `Found a local autosave draft from ${value}.`,
  restore: 'Restore',
  clear: 'Clear',
  localDraftRestored: 'Local autosave draft restored.',
  localDraftCleared: 'Local autosave draft cleared.',
  loadError: 'Failed to load editor data',
  loading: 'Loading post',
  saveSuccess: 'Post saved and a new revision snapshot was created.',
  saveError: 'Save failed',
  restoreConfirm: (version) => `Restore version ${version}? The current content will be saved as a new snapshot.`,
  restoreSuccess: (version) => `Restored to version ${version}.`,
  restoreError: 'Restore failed',
  justNow: 'Just now',
  title: 'Title',
  slug: 'Permalink',
  slugPlaceholder: 'Leave blank to generate automatically',
  excerpt: 'Excerpt',
  content: 'Content',
  status: 'Status',
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  sourceLanguage: 'Writing language',
  sourceLanguageHelper: 'Simplified Chinese is the default. After publishing, the backend automatically translates and caches every built-in language.',
  publishedAt: 'Publish time',
  publishHelperPublished: 'Leave blank to publish now. Choose a future time to schedule publication.',
  publishHelperHidden: 'Drafts and archived posts are hidden from the public site.',
  scheduledNotice: 'This post will appear automatically on the public site, RSS, and sitemap when the scheduled time arrives.',
  featured: 'Featured post',
  coverUrl: 'Cover image URL',
  chooseCover: 'Choose cover from media library',
  mediaTitle: 'Media Picker',
  mediaSubtitle: 'Search the media library, upload images, and insert them into content or set a cover.',
  openMediaLibrary: 'Open media library',
  noImages: 'No images in the media library.',
  cover: 'Cover',
  insert: 'Insert',
  categories: 'Categories',
  tags: 'Tags',
  selectionSeparator: ', ',
  seo: 'SEO',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description',
  revisions: 'Revision History',
  revisionsSubtitle: 'Every save creates a snapshot that can be restored at any time.',
  noRevisions: 'No revisions yet.',
  coverSelected: 'Cover image selected.',
  contentInserted: 'Inserted into content.',
  mediaUploaded: 'Media uploaded and ready to use.',
  uploadMediaError: 'Failed to upload media',
  chooseCoverDialog: 'Choose Cover Image',
  insertMediaDialog: 'Insert Media Image',
  uploadImage: 'Upload image',
  noFileSelected: 'No file selected',
  altText: 'Alt text',
  upload: 'Upload',
  uploading: 'Uploading',
  mediaSearchPlaceholder: 'Search filename, alt text, or URL',
  noMatchedImages: 'No matching images.',
  setAsCover: 'Set as cover',
  insertIntoContent: 'Insert into content',
  close: 'Close',
  toolbar: {
    h2: 'Heading 2',
    bold: 'Bold',
    quote: 'Quote',
    ul: 'Bulleted list',
    ol: 'Numbered list',
    link: 'Link',
    code: 'Code block',
    table: 'Table',
    linePlaceholder: 'Content',
    boldPlaceholder: 'Important text',
    linkPlaceholder: 'Link text',
    codePlaceholder: 'code',
    tableTemplate: '| Column | Notes |\n| --- | --- |\n| Example | Content |',
  },
  locale: 'en',
}

function variant(title: string, newTitle: string, locale: string): PostEditorUIText {
  return { ...en, editTitle: title, newTitle, locale }
}

const textByLanguage: Record<string, PostEditorUIText> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja: { ...variant('投稿を編集', '新規投稿', 'ja'), preview: 'プレビュー', save: '保存', close: '閉じる' },
  fr: { ...variant('Modifier l’article', 'Nouvel article', 'fr'), preview: 'Aperçu', save: 'Enregistrer', close: 'Fermer' },
  hi: { ...variant('पोस्ट संपादित करें', 'नई पोस्ट', 'hi'), preview: 'पूर्वावलोकन', save: 'सहेजें', close: 'बंद करें' },
  es: { ...variant('Editar entrada', 'Nueva entrada', 'es'), preview: 'Vista previa', save: 'Guardar', close: 'Cerrar' },
  ar: { ...variant('تحرير المقالة', 'مقالة جديدة', 'ar'), preview: 'معاينة', save: 'حفظ', close: 'إغلاق' },
  ru: { ...variant('Редактировать запись', 'Новая запись', 'ru'), preview: 'Предпросмотр', save: 'Сохранить', close: 'Закрыть' },
  pt: { ...variant('Editar post', 'Novo post', 'pt'), preview: 'Prévia', save: 'Salvar', close: 'Fechar' },
  eo: { ...variant('Redakti afiŝon', 'Nova afiŝo', 'eo'), preview: 'Antaŭrigardo', save: 'Konservi', close: 'Fermi' },
}

export function postEditorUIText(languageCode?: string | null) {
  return textByLanguage[normalizeLanguageCode(languageCode)] ?? zhCN
}

export function formatPostDraftSavedAt(value: string, text: Pick<PostEditorUIText, 'justNow' | 'locale'>) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return text.justNow
  return new Intl.DateTimeFormat(text.locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
