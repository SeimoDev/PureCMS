import { normalizeLanguageCode } from './i18n.js'
import type { Comment, Post } from './types.js'

export type CommonUIText = {
  emptyStateDescription: string
  loading: string
  loadingPage: string
  cancel: string
  confirm: string
  destructiveAction: string
  dateEmpty: {
    unpublished: string
    notSet: string
  }
  postStatusLabels: Record<Post['status'], string>
  commentStatusLabels: Record<Comment['status'], string>
}

const zhCN: CommonUIText = {
  emptyStateDescription: '当前没有可展示的数据。',
  loading: '加载中',
  loadingPage: '加载页面',
  cancel: '取消',
  confirm: '确认',
  destructiveAction: '危险操作',
  dateEmpty: { unpublished: '未发布', notSet: '未设置' },
  postStatusLabels: { published: '已发布', draft: '草稿', archived: '归档' },
  commentStatusLabels: { approved: '已通过', pending: '待审核', spam: '垃圾评论' },
}

const zhTW: CommonUIText = {
  emptyStateDescription: '目前沒有可顯示的資料。',
  loading: '載入中',
  loadingPage: '載入頁面',
  cancel: '取消',
  confirm: '確認',
  destructiveAction: '危險操作',
  dateEmpty: { unpublished: '未發布', notSet: '未設定' },
  postStatusLabels: { published: '已發布', draft: '草稿', archived: '封存' },
  commentStatusLabels: { approved: '已通過', pending: '待審核', spam: '垃圾留言' },
}

const en: CommonUIText = {
  emptyStateDescription: 'There is no data to display.',
  loading: 'Loading',
  loadingPage: 'Loading page',
  cancel: 'Cancel',
  confirm: 'Confirm',
  destructiveAction: 'Destructive action',
  dateEmpty: { unpublished: 'Unpublished', notSet: 'Not set' },
  postStatusLabels: { published: 'Published', draft: 'Draft', archived: 'Archived' },
  commentStatusLabels: { approved: 'Approved', pending: 'Pending', spam: 'Spam' },
}

function variant(overrides: Partial<CommonUIText>): CommonUIText {
  return {
    ...en,
    ...overrides,
    dateEmpty: { ...en.dateEmpty, ...overrides.dateEmpty },
    postStatusLabels: { ...en.postStatusLabels, ...overrides.postStatusLabels },
    commentStatusLabels: { ...en.commentStatusLabels, ...overrides.commentStatusLabels },
  }
}

const textByLanguage: Record<string, CommonUIText> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja: variant({
    emptyStateDescription: '表示できるデータはありません。',
    loading: '読み込み中',
    loadingPage: 'ページを読み込み中',
    cancel: 'キャンセル',
    confirm: '確認',
    destructiveAction: '危険な操作',
    dateEmpty: { unpublished: '未公開', notSet: '未設定' },
    postStatusLabels: { published: '公開済み', draft: '下書き', archived: 'アーカイブ' },
    commentStatusLabels: { approved: '承認済み', pending: '承認待ち', spam: 'スパム' },
  }),
  fr: variant({
    emptyStateDescription: 'Aucune donnée à afficher.',
    loading: 'Chargement',
    loadingPage: 'Chargement de la page',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    destructiveAction: 'Action destructive',
    dateEmpty: { unpublished: 'Non publié', notSet: 'Non défini' },
    postStatusLabels: { published: 'Publié', draft: 'Brouillon', archived: 'Archivé' },
    commentStatusLabels: { approved: 'Approuvé', pending: 'En attente', spam: 'Spam' },
  }),
  hi: variant({
    emptyStateDescription: 'दिखाने के लिए कोई डेटा नहीं है।',
    loading: 'लोड हो रहा है',
    loadingPage: 'पेज लोड हो रहा है',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    destructiveAction: 'जोखिम भरी कार्रवाई',
    dateEmpty: { unpublished: 'अप्रकाशित', notSet: 'सेट नहीं' },
    postStatusLabels: { published: 'प्रकाशित', draft: 'ड्राफ्ट', archived: 'आर्काइव' },
    commentStatusLabels: { approved: 'स्वीकृत', pending: 'लंबित', spam: 'स्पैम' },
  }),
  es: variant({
    emptyStateDescription: 'No hay datos para mostrar.',
    loading: 'Cargando',
    loadingPage: 'Cargando página',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    destructiveAction: 'Acción destructiva',
    dateEmpty: { unpublished: 'Sin publicar', notSet: 'No definido' },
    postStatusLabels: { published: 'Publicado', draft: 'Borrador', archived: 'Archivado' },
    commentStatusLabels: { approved: 'Aprobado', pending: 'Pendiente', spam: 'Spam' },
  }),
  ar: variant({
    emptyStateDescription: 'لا توجد بيانات للعرض.',
    loading: 'جار التحميل',
    loadingPage: 'جار تحميل الصفحة',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    destructiveAction: 'إجراء خطير',
    dateEmpty: { unpublished: 'غير منشور', notSet: 'غير مضبوط' },
    postStatusLabels: { published: 'منشور', draft: 'مسودة', archived: 'مؤرشف' },
    commentStatusLabels: { approved: 'مقبول', pending: 'معلق', spam: 'مزعج' },
  }),
  ru: variant({
    emptyStateDescription: 'Нет данных для отображения.',
    loading: 'Загрузка',
    loadingPage: 'Загрузка страницы',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    destructiveAction: 'Опасное действие',
    dateEmpty: { unpublished: 'Не опубликовано', notSet: 'Не задано' },
    postStatusLabels: { published: 'Опубликовано', draft: 'Черновик', archived: 'Архив' },
    commentStatusLabels: { approved: 'Одобрен', pending: 'Ожидает', spam: 'Спам' },
  }),
  pt: variant({
    emptyStateDescription: 'Não há dados para exibir.',
    loading: 'Carregando',
    loadingPage: 'Carregando página',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    destructiveAction: 'Ação destrutiva',
    dateEmpty: { unpublished: 'Não publicado', notSet: 'Não definido' },
    postStatusLabels: { published: 'Publicado', draft: 'Rascunho', archived: 'Arquivado' },
    commentStatusLabels: { approved: 'Aprovado', pending: 'Pendente', spam: 'Spam' },
  }),
  eo: variant({
    emptyStateDescription: 'Ne estas datumoj por montri.',
    loading: 'Ŝargante',
    loadingPage: 'Ŝargante paĝon',
    cancel: 'Nuligi',
    confirm: 'Konfirmi',
    destructiveAction: 'Detrua ago',
    dateEmpty: { unpublished: 'Nepublikigita', notSet: 'Ne agordita' },
    postStatusLabels: { published: 'Publikigita', draft: 'Malneto', archived: 'Arkivigita' },
    commentStatusLabels: { approved: 'Aprobita', pending: 'Atenda', spam: 'Spamo' },
  }),
}

export function commonUIText(languageCode?: string | null) {
  return textByLanguage[normalizeLanguageCode(languageCode)] ?? zhCN
}
