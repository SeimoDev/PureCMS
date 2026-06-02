import type { ArticleMetricText } from './articleMetrics.js'
import { normalizeLanguageCode } from './i18n.js'
import type { Page, Post } from './types.js'

export type ContentPreviewUIText = {
  invalidAddress: string
  loadError: string
  loading: string
  missing: string
  previewBadge: string
  backToEdit: string
  publicPage: string
  fallbackAuthor: string
  tocTitle: string
  tocNavLabel: string
  customPage: string
  statusLabels: Record<Post['status'] | Page['status'], string>
  metrics: ArticleMetricText
  locale: string
}

const zhCN: ContentPreviewUIText = {
  invalidAddress: '预览地址不正确',
  loadError: '读取预览失败',
  loading: '生成预览',
  missing: '预览内容不存在。',
  previewBadge: '后台预览',
  backToEdit: '返回编辑',
  publicPage: '公开页',
  fallbackAuthor: '站长',
  tocTitle: '本文目录',
  tocNavLabel: '文章目录',
  customPage: '自定义页面',
  statusLabels: { published: '已发布', draft: '草稿', archived: '归档' },
  metrics: {
    textUnitCount: (textUnits) => `约 ${textUnits} 字`,
    largeTextUnitCount: (value) => `约 ${value} 万字`,
    readingLessThanOneMinute: '少于 1 分钟阅读',
    readingMinutes: (minutes) => `${minutes} 分钟阅读`,
    locale: 'zh-CN',
  },
  locale: 'zh-CN',
}

const zhTW: ContentPreviewUIText = {
  ...zhCN,
  invalidAddress: '預覽地址不正確',
  loadError: '讀取預覽失敗',
  loading: '產生預覽',
  missing: '預覽內容不存在。',
  previewBadge: '後台預覽',
  backToEdit: '返回編輯',
  publicPage: '公開頁',
  fallbackAuthor: '站長',
  tocTitle: '本文目錄',
  tocNavLabel: '文章目錄',
  customPage: '自訂頁面',
  statusLabels: { published: '已發布', draft: '草稿', archived: '封存' },
  metrics: {
    textUnitCount: (textUnits) => `約 ${textUnits} 字`,
    largeTextUnitCount: (value) => `約 ${value} 萬字`,
    readingLessThanOneMinute: '少於 1 分鐘閱讀',
    readingMinutes: (minutes) => `${minutes} 分鐘閱讀`,
    locale: 'zh-TW',
  },
  locale: 'zh-TW',
}

const en: ContentPreviewUIText = {
  ...zhCN,
  invalidAddress: 'Preview URL is invalid',
  loadError: 'Failed to load preview',
  loading: 'Generating preview',
  missing: 'Preview content does not exist.',
  previewBadge: 'Admin preview',
  backToEdit: 'Back to edit',
  publicPage: 'Public page',
  fallbackAuthor: 'Site owner',
  tocTitle: 'Contents',
  tocNavLabel: 'Article contents',
  customPage: 'Custom page',
  statusLabels: { published: 'Published', draft: 'Draft', archived: 'Archived' },
  metrics: {
    textUnitCount: (textUnits) => `About ${new Intl.NumberFormat('en').format(textUnits)} words`,
    largeTextUnitCount: (value) => `About ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) * 10000)} words`,
    readingLessThanOneMinute: 'Less than 1 min read',
    readingMinutes: (minutes) => `${minutes} min read`,
    locale: 'en',
  },
  locale: 'en',
}

function variant(overrides: Partial<ContentPreviewUIText>, locale: string): ContentPreviewUIText {
  return { ...en, ...overrides, locale, metrics: { ...en.metrics, locale, ...overrides.metrics } }
}

const textByLanguage: Record<string, ContentPreviewUIText> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja: variant(
    {
      invalidAddress: 'プレビュー URL が正しくありません',
      loading: 'プレビューを生成中',
      previewBadge: '管理プレビュー',
      backToEdit: '編集に戻る',
      publicPage: '公開ページ',
      customPage: 'カスタムページ',
      statusLabels: { published: '公開済み', draft: '下書き', archived: 'アーカイブ' },
    },
    'ja',
  ),
  fr: variant(
    {
      invalidAddress: 'Adresse de prévisualisation invalide',
      loading: 'Génération de l’aperçu',
      previewBadge: 'Aperçu admin',
      backToEdit: 'Retour à l’édition',
      publicPage: 'Page publique',
      customPage: 'Page personnalisée',
      statusLabels: { published: 'Publié', draft: 'Brouillon', archived: 'Archivé' },
    },
    'fr',
  ),
  hi: variant(
    {
      invalidAddress: 'पूर्वावलोकन पता सही नहीं है',
      loading: 'पूर्वावलोकन बन रहा है',
      previewBadge: 'एडमिन पूर्वावलोकन',
      backToEdit: 'संपादन पर लौटें',
      publicPage: 'सार्वजनिक पेज',
      customPage: 'कस्टम पेज',
      statusLabels: { published: 'प्रकाशित', draft: 'ड्राफ्ट', archived: 'आर्काइव' },
    },
    'hi',
  ),
  es: variant(
    {
      invalidAddress: 'La URL de vista previa no es válida',
      loading: 'Generando vista previa',
      previewBadge: 'Vista previa admin',
      backToEdit: 'Volver a editar',
      publicPage: 'Página pública',
      customPage: 'Página personalizada',
      statusLabels: { published: 'Publicado', draft: 'Borrador', archived: 'Archivado' },
    },
    'es',
  ),
  ar: variant(
    {
      invalidAddress: 'رابط المعاينة غير صحيح',
      loading: 'جار إنشاء المعاينة',
      previewBadge: 'معاينة الإدارة',
      backToEdit: 'العودة للتحرير',
      publicPage: 'الصفحة العامة',
      customPage: 'صفحة مخصصة',
      statusLabels: { published: 'منشور', draft: 'مسودة', archived: 'مؤرشف' },
    },
    'ar',
  ),
  ru: variant(
    {
      invalidAddress: 'Адрес предпросмотра некорректен',
      loading: 'Создание предпросмотра',
      previewBadge: 'Админ-предпросмотр',
      backToEdit: 'Вернуться к редактированию',
      publicPage: 'Публичная страница',
      customPage: 'Пользовательская страница',
      statusLabels: { published: 'Опубликовано', draft: 'Черновик', archived: 'Архив' },
    },
    'ru',
  ),
  pt: variant(
    {
      invalidAddress: 'URL de prévia inválida',
      loading: 'Gerando prévia',
      previewBadge: 'Prévia admin',
      backToEdit: 'Voltar para edição',
      publicPage: 'Página pública',
      customPage: 'Página personalizada',
      statusLabels: { published: 'Publicado', draft: 'Rascunho', archived: 'Arquivado' },
    },
    'pt',
  ),
  eo: variant(
    {
      invalidAddress: 'Antaŭrigarda adreso ne ĝustas',
      loading: 'Generante antaŭrigardon',
      previewBadge: 'Administra antaŭrigardo',
      backToEdit: 'Reiri al redaktado',
      publicPage: 'Publika paĝo',
      customPage: 'Propra paĝo',
      statusLabels: { published: 'Publikigita', draft: 'Malneto', archived: 'Arkivigita' },
    },
    'eo',
  ),
}

export function contentPreviewUIText(languageCode?: string | null) {
  return textByLanguage[normalizeLanguageCode(languageCode)] ?? zhCN
}
