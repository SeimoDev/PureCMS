import { normalizeLanguageCode } from './i18n'

export type AnalyticsMetricKey = 'totalViews' | 'todayViews' | 'days'

export type AnalyticsText = {
  title: string
  subtitle: string
  loading: string
  loadFailed: string
  retry: string
  refresh: string
  rangeAria: string
  dayOption: (days: number) => string
  metrics: Record<AnalyticsMetricKey, string>
  dailyTrend: string
  recentDays: (days: number) => string
  totalViewsChip: (views: string) => string
  popularPosts: string
  currentRange: string
  empty: string
}

export const defaultAnalyticsText: AnalyticsText = {
  title: '访问统计',
  subtitle: '按北京时间汇总前台文章访问趋势和热门内容',
  loading: '读取访问统计',
  loadFailed: '读取访问统计失败',
  retry: '重试',
  refresh: '刷新统计',
  rangeAria: '统计区间',
  dayOption: (days) => `${days} 天`,
  metrics: {
    totalViews: '累计浏览',
    todayViews: '今日浏览',
    days: '统计天数',
  },
  dailyTrend: '每日趋势',
  recentDays: (days) => `最近 ${days} 天`,
  totalViewsChip: (views) => `${views} 总浏览`,
  popularPosts: '热门文章',
  currentRange: '当前统计区间',
  empty: '暂无访问数据',
}

const analyticsTextByLanguage: Record<string, AnalyticsText> = {
  'zh-CN': defaultAnalyticsText,
  'zh-TW': {
    title: '訪問統計',
    subtitle: '依北京時間彙總前台文章訪問趨勢和熱門內容',
    loading: '讀取訪問統計',
    loadFailed: '讀取訪問統計失敗',
    retry: '重試',
    refresh: '重新整理統計',
    rangeAria: '統計區間',
    dayOption: (days) => `${days} 天`,
    metrics: {
      totalViews: '累計瀏覽',
      todayViews: '今日瀏覽',
      days: '統計天數',
    },
    dailyTrend: '每日趨勢',
    recentDays: (days) => `最近 ${days} 天`,
    totalViewsChip: (views) => `${views} 總瀏覽`,
    popularPosts: '熱門文章',
    currentRange: '目前統計區間',
    empty: '暫無訪問資料',
  },
  en: {
    title: 'Analytics',
    subtitle: 'Article traffic trends and popular content summarized in Beijing time',
    loading: 'Loading analytics',
    loadFailed: 'Failed to load analytics',
    retry: 'Retry',
    refresh: 'Refresh analytics',
    rangeAria: 'Analytics range',
    dayOption: (days) => `${days} days`,
    metrics: {
      totalViews: 'Total views',
      todayViews: 'Today',
      days: 'Days tracked',
    },
    dailyTrend: 'Daily Trend',
    recentDays: (days) => `Last ${days} days`,
    totalViewsChip: (views) => `${views} total views`,
    popularPosts: 'Popular Posts',
    currentRange: 'Current range',
    empty: 'No traffic data yet',
  },
  ja: {
    title: 'アクセス解析',
    subtitle: '北京時間で記事アクセスの傾向と人気コンテンツを集計します',
    loading: 'アクセス解析を読み込み中',
    loadFailed: 'アクセス解析の読み込みに失敗しました',
    retry: '再試行',
    refresh: '解析を更新',
    rangeAria: '集計期間',
    dayOption: (days) => `${days} 日`,
    metrics: {
      totalViews: '累計閲覧',
      todayViews: '今日の閲覧',
      days: '集計日数',
    },
    dailyTrend: '日別推移',
    recentDays: (days) => `直近 ${days} 日`,
    totalViewsChip: (views) => `${views} 累計閲覧`,
    popularPosts: '人気記事',
    currentRange: '現在の集計期間',
    empty: 'アクセスデータはまだありません',
  },
  fr: {
    title: 'Statistiques',
    subtitle: 'Tendances de visites et contenus populaires agrégés en heure de Pékin',
    loading: 'Chargement des statistiques',
    loadFailed: 'Échec du chargement des statistiques',
    retry: 'Réessayer',
    refresh: 'Actualiser les statistiques',
    rangeAria: 'Période statistique',
    dayOption: (days) => `${days} jours`,
    metrics: {
      totalViews: 'Vues cumulées',
      todayViews: "Aujourd'hui",
      days: 'Jours suivis',
    },
    dailyTrend: 'Tendance quotidienne',
    recentDays: (days) => `${days} derniers jours`,
    totalViewsChip: (views) => `${views} vues au total`,
    popularPosts: 'Articles populaires',
    currentRange: 'Période actuelle',
    empty: 'Aucune donnée de visite',
  },
  hi: {
    title: 'विश्लेषण',
    subtitle: 'बीजिंग समय के अनुसार लेख ट्रैफ़िक और लोकप्रिय सामग्री',
    loading: 'विश्लेषण लोड हो रहा है',
    loadFailed: 'विश्लेषण लोड करने में विफल',
    retry: 'फिर कोशिश करें',
    refresh: 'विश्लेषण रीफ़्रेश करें',
    rangeAria: 'विश्लेषण अवधि',
    dayOption: (days) => `${days} दिन`,
    metrics: {
      totalViews: 'कुल दृश्य',
      todayViews: 'आज',
      days: 'ट्रैक किए दिन',
    },
    dailyTrend: 'दैनिक रुझान',
    recentDays: (days) => `पिछले ${days} दिन`,
    totalViewsChip: (views) => `${views} कुल दृश्य`,
    popularPosts: 'लोकप्रिय लेख',
    currentRange: 'वर्तमान अवधि',
    empty: 'अभी कोई ट्रैफ़िक डेटा नहीं',
  },
  es: {
    title: 'Analíticas',
    subtitle: 'Tendencias de visitas y contenido popular resumidos en hora de Pekín',
    loading: 'Cargando analíticas',
    loadFailed: 'No se pudieron cargar las analíticas',
    retry: 'Reintentar',
    refresh: 'Actualizar analíticas',
    rangeAria: 'Rango de analíticas',
    dayOption: (days) => `${days} días`,
    metrics: {
      totalViews: 'Vistas totales',
      todayViews: 'Hoy',
      days: 'Días medidos',
    },
    dailyTrend: 'Tendencia diaria',
    recentDays: (days) => `Últimos ${days} días`,
    totalViewsChip: (views) => `${views} vistas totales`,
    popularPosts: 'Artículos populares',
    currentRange: 'Rango actual',
    empty: 'Aún no hay datos de visitas',
  },
  ar: {
    title: 'التحليلات',
    subtitle: 'اتجاهات زيارات المقالات والمحتوى الشائع حسب توقيت بكين',
    loading: 'جار تحميل التحليلات',
    loadFailed: 'فشل تحميل التحليلات',
    retry: 'إعادة المحاولة',
    refresh: 'تحديث التحليلات',
    rangeAria: 'نطاق التحليلات',
    dayOption: (days) => `${days} أيام`,
    metrics: {
      totalViews: 'إجمالي المشاهدات',
      todayViews: 'اليوم',
      days: 'أيام التتبع',
    },
    dailyTrend: 'الاتجاه اليومي',
    recentDays: (days) => `آخر ${days} أيام`,
    totalViewsChip: (views) => `${views} مشاهدة إجمالية`,
    popularPosts: 'المقالات الشائعة',
    currentRange: 'النطاق الحالي',
    empty: 'لا توجد بيانات زيارات بعد',
  },
  ru: {
    title: 'Аналитика',
    subtitle: 'Тренды посещений статей и популярный контент по пекинскому времени',
    loading: 'Загрузка аналитики',
    loadFailed: 'Не удалось загрузить аналитику',
    retry: 'Повторить',
    refresh: 'Обновить аналитику',
    rangeAria: 'Период аналитики',
    dayOption: (days) => `${days} дней`,
    metrics: {
      totalViews: 'Всего просмотров',
      todayViews: 'Сегодня',
      days: 'Дней в отчете',
    },
    dailyTrend: 'Ежедневный тренд',
    recentDays: (days) => `Последние ${days} дней`,
    totalViewsChip: (views) => `${views} просмотров всего`,
    popularPosts: 'Популярные статьи',
    currentRange: 'Текущий период',
    empty: 'Данных о посещениях пока нет',
  },
  pt: {
    title: 'Análises',
    subtitle: 'Tendências de visitas e conteúdo popular em horário de Pequim',
    loading: 'Carregando análises',
    loadFailed: 'Falha ao carregar análises',
    retry: 'Tentar novamente',
    refresh: 'Atualizar análises',
    rangeAria: 'Período das análises',
    dayOption: (days) => `${days} dias`,
    metrics: {
      totalViews: 'Visualizações totais',
      todayViews: 'Hoje',
      days: 'Dias acompanhados',
    },
    dailyTrend: 'Tendência diária',
    recentDays: (days) => `Últimos ${days} dias`,
    totalViewsChip: (views) => `${views} visualizações totais`,
    popularPosts: 'Posts populares',
    currentRange: 'Período atual',
    empty: 'Ainda não há dados de visitas',
  },
  eo: {
    title: 'Analitiko',
    subtitle: 'Artikolaj vizittendencoj kaj populara enhavo laŭ Pekina tempo',
    loading: 'Ŝargante analitikon',
    loadFailed: 'Malsukcesis ŝargi analitikon',
    retry: 'Reprovi',
    refresh: 'Refreŝigi analitikon',
    rangeAria: 'Analitika intervalo',
    dayOption: (days) => `${days} tagoj`,
    metrics: {
      totalViews: 'Totalaj vidoj',
      todayViews: 'Hodiaŭ',
      days: 'Spuritaj tagoj',
    },
    dailyTrend: 'Ĉiutaga tendenco',
    recentDays: (days) => `Lastaj ${days} tagoj`,
    totalViewsChip: (views) => `${views} totalaj vidoj`,
    popularPosts: 'Popularaj afiŝoj',
    currentRange: 'Nuna intervalo',
    empty: 'Ankoraŭ ne estas vizitdatumoj',
  },
}

export function analyticsUIText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return analyticsTextByLanguage[code] ?? defaultAnalyticsText
}

export function formatAnalyticsDay(value: string, languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    const [, year, month, day] = match
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return new Intl.DateTimeFormat(code, { month: '2-digit', day: '2-digit', timeZone: 'UTC' }).format(date)
  }
  return value
}
