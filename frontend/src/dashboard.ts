import { normalizeLanguageCode } from './i18n'
import type { DashboardStats } from './types'

export type DashboardTaskTone = 'urgent' | 'active' | 'calm'
export type DashboardMetricKey = 'posts' | 'publishedPosts' | 'scheduledPosts' | 'featuredPosts' | 'pendingComments' | 'mediaAssets' | 'users'

export type DashboardTask = {
  key: string
  title: string
  description: string
  action: string
  href: string
  count: number
  tone: DashboardTaskTone
}

export type DashboardQuickAction = {
  key: string
  title: string
  description: string
  href: string
}

export type DashboardText = {
  loading: string
  title: string
  subtitle: string
  reviewComments: string
  writePost: string
  tasksTitle: string
  tasksSubtitle: string
  quickTitle: string
  quickSubtitle: string
  metrics: Record<DashboardMetricKey, string>
  tones: Record<DashboardTaskTone, string>
  chips: {
    drafts: (count: number) => string
    featured: (count: number) => string
    approvedComments: (count: number) => string
    categories: (count: number) => string
    tags: (count: number) => string
    activityLogs: (count: number) => string
    views: (count: string) => string
  }
  tasks: {
    pendingComments: {
      title: string
      description: (count: number) => string
      action: (count: number) => string
    }
    scheduledPosts: {
      title: string
      description: (count: number) => string
      action: (count: number) => string
    }
    draftPosts: {
      title: string
      description: (count: number) => string
      action: (count: number) => string
    }
    featuredPosts: {
      title: string
      description: (count: number) => string
      action: (count: number) => string
    }
    contentStructure: {
      title: string
      description: (categories: number, tags: number) => string
      action: string
    }
    mediaLibrary: {
      title: string
      description: (count: number) => string
      action: (count: number) => string
    }
  }
  quickActions: {
    newPost: { title: string; description: string }
    pages: { title: string; description: string }
    media: { title: string; description: string }
    comments: { title: string; description: string }
  }
}

export const defaultDashboardText: DashboardText = {
  loading: '读取工作台',
  title: '工作台',
  subtitle: '内容、互动、媒体和后台治理概览',
  reviewComments: '审核评论',
  writePost: '写文章',
  tasksTitle: '待处理事项',
  tasksSubtitle: '按评论、草稿、内容结构和素材状态组织日常运营动作',
  quickTitle: '快速入口',
  quickSubtitle: '高频内容维护入口集中在工作台底部',
  metrics: {
    posts: '文章总数',
    publishedPosts: '已发布',
    scheduledPosts: '定时发布',
    featuredPosts: '首页精选',
    pendingComments: '待审评论',
    mediaAssets: '媒体文件',
    users: '后台用户',
  },
  tones: {
    urgent: '优先',
    active: '推进',
    calm: '正常',
  },
  chips: {
    drafts: (count) => `草稿 ${count}`,
    featured: (count) => `精选 ${count}`,
    approvedComments: (count) => `已通过评论 ${count}`,
    categories: (count) => `分类 ${count}`,
    tags: (count) => `标签 ${count}`,
    activityLogs: (count) => `操作日志 ${count}`,
    views: (count) => `浏览 ${count}`,
  },
  tasks: {
    pendingComments: {
      title: '评论审核',
      description: (count) => (count > 0 ? `${count} 条评论等待处理` : '暂无待审评论'),
      action: (count) => (count > 0 ? '去审核' : '查看评论'),
    },
    scheduledPosts: {
      title: '定时发布',
      description: (count) => (count > 0 ? `${count} 篇文章等待自动公开` : '暂无排期文章'),
      action: (count) => (count > 0 ? '查看排期' : '查看文章'),
    },
    draftPosts: {
      title: '草稿箱',
      description: (count) => (count > 0 ? `${count} 篇草稿可继续编辑` : '没有未完成草稿'),
      action: (count) => (count > 0 ? '继续编辑' : '查看文章'),
    },
    featuredPosts: {
      title: '首页精选',
      description: (count) => (count > 0 ? `${count} 篇文章在首页推荐位展示` : '尚未设置首页精选文章'),
      action: (count) => (count > 0 ? '维护精选' : '设置精选'),
    },
    contentStructure: {
      title: '内容结构',
      description: (categories, tags) => `已建立 ${categories} 个分类、${tags} 个标签`,
      action: '整理结构',
    },
    mediaLibrary: {
      title: '媒体库',
      description: (count) => (count > 0 ? `已有 ${count} 个资源可复用` : '尚未上传媒体资源'),
      action: (count) => (count > 0 ? '管理媒体' : '上传资源'),
    },
  },
  quickActions: {
    newPost: {
      title: '写文章',
      description: '创建文章、SEO 信息和定时发布',
    },
    pages: {
      title: '页面',
      description: '维护关于页、导航页和独立内容',
    },
    media: {
      title: '媒体',
      description: '上传图片、PDF 和文本资料',
    },
    comments: {
      title: '评论',
      description: '审核、回复和清理互动内容',
    },
  },
}

const dashboardTextByLanguage: Record<string, DashboardText> = {
  'zh-CN': defaultDashboardText,
  'zh-TW': {
    loading: '讀取工作台',
    title: '工作台',
    subtitle: '內容、互動、媒體和後台治理概覽',
    reviewComments: '審核留言',
    writePost: '寫文章',
    tasksTitle: '待處理事項',
    tasksSubtitle: '依留言、草稿、內容結構和素材狀態組織日常營運動作',
    quickTitle: '快速入口',
    quickSubtitle: '高頻內容維護入口集中在工作台底部',
    metrics: {
      posts: '文章總數',
      publishedPosts: '已發布',
      scheduledPosts: '定時發布',
      featuredPosts: '首頁精選',
      pendingComments: '待審留言',
      mediaAssets: '媒體檔案',
      users: '後台使用者',
    },
    tones: { urgent: '優先', active: '推進', calm: '正常' },
    chips: {
      drafts: (count) => `草稿 ${count}`,
      featured: (count) => `精選 ${count}`,
      approvedComments: (count) => `已通過留言 ${count}`,
      categories: (count) => `分類 ${count}`,
      tags: (count) => `標籤 ${count}`,
      activityLogs: (count) => `操作日誌 ${count}`,
      views: (count) => `瀏覽 ${count}`,
    },
    tasks: {
      pendingComments: {
        title: '留言審核',
        description: (count) => (count > 0 ? `${count} 則留言等待處理` : '暫無待審留言'),
        action: (count) => (count > 0 ? '去審核' : '查看留言'),
      },
      scheduledPosts: {
        title: '定時發布',
        description: (count) => (count > 0 ? `${count} 篇文章等待自動公開` : '暫無排程文章'),
        action: (count) => (count > 0 ? '查看排程' : '查看文章'),
      },
      draftPosts: {
        title: '草稿箱',
        description: (count) => (count > 0 ? `${count} 篇草稿可繼續編輯` : '沒有未完成草稿'),
        action: (count) => (count > 0 ? '繼續編輯' : '查看文章'),
      },
      featuredPosts: {
        title: '首頁精選',
        description: (count) => (count > 0 ? `${count} 篇文章在首頁推薦位展示` : '尚未設定首頁精選文章'),
        action: (count) => (count > 0 ? '維護精選' : '設定精選'),
      },
      contentStructure: {
        title: '內容結構',
        description: (categories, tags) => `已建立 ${categories} 個分類、${tags} 個標籤`,
        action: '整理結構',
      },
      mediaLibrary: {
        title: '媒體庫',
        description: (count) => (count > 0 ? `已有 ${count} 個資源可重用` : '尚未上傳媒體資源'),
        action: (count) => (count > 0 ? '管理媒體' : '上傳資源'),
      },
    },
    quickActions: {
      newPost: { title: '寫文章', description: '建立文章、SEO 資訊和定時發布' },
      pages: { title: '頁面', description: '維護關於頁、導覽頁和獨立內容' },
      media: { title: '媒體', description: '上傳圖片、PDF 和文字資料' },
      comments: { title: '留言', description: '審核、回覆和清理互動內容' },
    },
  },
  en: {
    loading: 'Loading dashboard',
    title: 'Dashboard',
    subtitle: 'Overview of content, engagement, media, and admin operations',
    reviewComments: 'Review comments',
    writePost: 'Write post',
    tasksTitle: 'Pending Work',
    tasksSubtitle: 'Daily operations organized by comments, drafts, structure, and media status',
    quickTitle: 'Quick Actions',
    quickSubtitle: 'High-frequency content maintenance shortcuts are grouped here',
    metrics: {
      posts: 'Total posts',
      publishedPosts: 'Published',
      scheduledPosts: 'Scheduled',
      featuredPosts: 'Featured',
      pendingComments: 'Pending comments',
      mediaAssets: 'Media files',
      users: 'Admin users',
    },
    tones: { urgent: 'Priority', active: 'Active', calm: 'Normal' },
    chips: {
      drafts: (count) => `Drafts ${count}`,
      featured: (count) => `Featured ${count}`,
      approvedComments: (count) => `Approved comments ${count}`,
      categories: (count) => `Categories ${count}`,
      tags: (count) => `Tags ${count}`,
      activityLogs: (count) => `Activity logs ${count}`,
      views: (count) => `Views ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'Comment review',
        description: (count) => (count > 0 ? `${count} comments need review` : 'No comments waiting for review'),
        action: (count) => (count > 0 ? 'Review now' : 'View comments'),
      },
      scheduledPosts: {
        title: 'Scheduled publishing',
        description: (count) => (count > 0 ? `${count} posts waiting to go public` : 'No scheduled posts'),
        action: (count) => (count > 0 ? 'View schedule' : 'View posts'),
      },
      draftPosts: {
        title: 'Drafts',
        description: (count) => (count > 0 ? `${count} drafts can be continued` : 'No unfinished drafts'),
        action: (count) => (count > 0 ? 'Continue editing' : 'View posts'),
      },
      featuredPosts: {
        title: 'Homepage featured',
        description: (count) => (count > 0 ? `${count} posts are shown in featured slots` : 'No homepage featured posts yet'),
        action: (count) => (count > 0 ? 'Maintain featured' : 'Set featured'),
      },
      contentStructure: {
        title: 'Content structure',
        description: (categories, tags) => `${categories} categories and ${tags} tags created`,
        action: 'Organize structure',
      },
      mediaLibrary: {
        title: 'Media library',
        description: (count) => (count > 0 ? `${count} reusable assets available` : 'No media assets uploaded yet'),
        action: (count) => (count > 0 ? 'Manage media' : 'Upload assets'),
      },
    },
    quickActions: {
      newPost: { title: 'Write post', description: 'Create content, SEO metadata, and schedule publishing' },
      pages: { title: 'Pages', description: 'Maintain about pages, navigation pages, and standalone content' },
      media: { title: 'Media', description: 'Upload images, PDFs, and text assets' },
      comments: { title: 'Comments', description: 'Review, reply to, and clean up interactions' },
    },
  },
  ja: {
    loading: 'ダッシュボードを読み込み中',
    title: 'ダッシュボード',
    subtitle: 'コンテンツ、反応、メディア、管理運用の概要',
    reviewComments: 'コメントを審査',
    writePost: '記事を書く',
    tasksTitle: '対応待ち',
    tasksSubtitle: 'コメント、下書き、構造、素材状態から日々の運用を整理します',
    quickTitle: 'クイック操作',
    quickSubtitle: 'よく使う管理入口をここに集約しています',
    metrics: {
      posts: '記事総数',
      publishedPosts: '公開済み',
      scheduledPosts: '予約公開',
      featuredPosts: '注目記事',
      pendingComments: '承認待ちコメント',
      mediaAssets: 'メディア',
      users: '管理ユーザー',
    },
    tones: { urgent: '優先', active: '進行', calm: '正常' },
    chips: {
      drafts: (count) => `下書き ${count}`,
      featured: (count) => `注目 ${count}`,
      approvedComments: (count) => `承認済みコメント ${count}`,
      categories: (count) => `カテゴリー ${count}`,
      tags: (count) => `タグ ${count}`,
      activityLogs: (count) => `操作ログ ${count}`,
      views: (count) => `閲覧 ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'コメント審査',
        description: (count) => (count > 0 ? `${count} 件のコメントが処理待ちです` : '承認待ちコメントはありません'),
        action: (count) => (count > 0 ? '審査する' : 'コメントを見る'),
      },
      scheduledPosts: {
        title: '予約公開',
        description: (count) => (count > 0 ? `${count} 件の記事が自動公開待ちです` : '予約公開の記事はありません'),
        action: (count) => (count > 0 ? '予定を見る' : '記事を見る'),
      },
      draftPosts: {
        title: '下書き',
        description: (count) => (count > 0 ? `${count} 件の下書きを編集できます` : '未完成の下書きはありません'),
        action: (count) => (count > 0 ? '編集を続ける' : '記事を見る'),
      },
      featuredPosts: {
        title: 'ホーム注目',
        description: (count) => (count > 0 ? `${count} 件の記事が注目枠に表示されています` : 'ホーム注目記事は未設定です'),
        action: (count) => (count > 0 ? '注目を管理' : '注目を設定'),
      },
      contentStructure: {
        title: 'コンテンツ構造',
        description: (categories, tags) => `${categories} 件のカテゴリー、${tags} 件のタグを作成済み`,
        action: '構造を整理',
      },
      mediaLibrary: {
        title: 'メディア',
        description: (count) => (count > 0 ? `${count} 件の素材を再利用できます` : 'メディア素材は未アップロードです'),
        action: (count) => (count > 0 ? 'メディア管理' : '素材をアップロード'),
      },
    },
    quickActions: {
      newPost: { title: '記事を書く', description: '記事、SEO 情報、予約公開を作成' },
      pages: { title: 'ページ', description: '紹介ページ、ナビゲーション、独立コンテンツを管理' },
      media: { title: 'メディア', description: '画像、PDF、テキスト資料をアップロード' },
      comments: { title: 'コメント', description: '審査、返信、交流内容の整理' },
    },
  },
  fr: {
    loading: 'Chargement du tableau de bord',
    title: 'Tableau de bord',
    subtitle: 'Vue d’ensemble du contenu, des interactions, des médias et de l’administration',
    reviewComments: 'Modérer les commentaires',
    writePost: 'Écrire un article',
    tasksTitle: 'À traiter',
    tasksSubtitle: 'Actions quotidiennes organisées par commentaires, brouillons, structure et médias',
    quickTitle: 'Accès rapides',
    quickSubtitle: 'Raccourcis de maintenance courants regroupés ici',
    metrics: {
      posts: 'Total articles',
      publishedPosts: 'Publiés',
      scheduledPosts: 'Planifiés',
      featuredPosts: 'Mis en avant',
      pendingComments: 'Commentaires en attente',
      mediaAssets: 'Fichiers médias',
      users: 'Utilisateurs admin',
    },
    tones: { urgent: 'Priorité', active: 'À suivre', calm: 'Normal' },
    chips: {
      drafts: (count) => `Brouillons ${count}`,
      featured: (count) => `Mis en avant ${count}`,
      approvedComments: (count) => `Commentaires approuvés ${count}`,
      categories: (count) => `Catégories ${count}`,
      tags: (count) => `Étiquettes ${count}`,
      activityLogs: (count) => `Journal ${count}`,
      views: (count) => `Vues ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'Modération',
        description: (count) => (count > 0 ? `${count} commentaires à traiter` : 'Aucun commentaire en attente'),
        action: (count) => (count > 0 ? 'Modérer' : 'Voir les commentaires'),
      },
      scheduledPosts: {
        title: 'Publication planifiée',
        description: (count) => (count > 0 ? `${count} articles attendent la publication automatique` : 'Aucun article planifié'),
        action: (count) => (count > 0 ? 'Voir le planning' : 'Voir les articles'),
      },
      draftPosts: {
        title: 'Brouillons',
        description: (count) => (count > 0 ? `${count} brouillons peuvent être poursuivis` : 'Aucun brouillon inachevé'),
        action: (count) => (count > 0 ? 'Continuer' : 'Voir les articles'),
      },
      featuredPosts: {
        title: 'Sélection accueil',
        description: (count) => (count > 0 ? `${count} articles sont affichés en sélection` : 'Aucun article sélectionné pour l’accueil'),
        action: (count) => (count > 0 ? 'Gérer la sélection' : 'Définir la sélection'),
      },
      contentStructure: {
        title: 'Structure',
        description: (categories, tags) => `${categories} catégories et ${tags} étiquettes créées`,
        action: 'Organiser',
      },
      mediaLibrary: {
        title: 'Médiathèque',
        description: (count) => (count > 0 ? `${count} ressources réutilisables` : 'Aucune ressource média téléversée'),
        action: (count) => (count > 0 ? 'Gérer les médias' : 'Téléverser'),
      },
    },
    quickActions: {
      newPost: { title: 'Écrire', description: 'Créer un article, du SEO et une planification' },
      pages: { title: 'Pages', description: 'Maintenir pages à propos, navigation et contenus autonomes' },
      media: { title: 'Médias', description: 'Téléverser images, PDF et documents texte' },
      comments: { title: 'Commentaires', description: 'Modérer, répondre et nettoyer les interactions' },
    },
  },
  hi: {
    loading: 'डैशबोर्ड लोड हो रहा है',
    title: 'डैशबोर्ड',
    subtitle: 'सामग्री, संवाद, मीडिया और प्रशासन का सारांश',
    reviewComments: 'टिप्पणियां जांचें',
    writePost: 'लेख लिखें',
    tasksTitle: 'लंबित काम',
    tasksSubtitle: 'टिप्पणी, ड्राफ्ट, संरचना और मीडिया स्थिति के आधार पर रोज़ाना काम',
    quickTitle: 'त्वरित प्रवेश',
    quickSubtitle: 'अक्सर उपयोग होने वाले सामग्री रखरखाव प्रवेश यहां हैं',
    metrics: {
      posts: 'कुल लेख',
      publishedPosts: 'प्रकाशित',
      scheduledPosts: 'निर्धारित',
      featuredPosts: 'विशेष',
      pendingComments: 'लंबित टिप्पणियां',
      mediaAssets: 'मीडिया फ़ाइलें',
      users: 'प्रशासन उपयोगकर्ता',
    },
    tones: { urgent: 'प्राथमिक', active: 'सक्रिय', calm: 'सामान्य' },
    chips: {
      drafts: (count) => `ड्राफ्ट ${count}`,
      featured: (count) => `विशेष ${count}`,
      approvedComments: (count) => `स्वीकृत टिप्पणियां ${count}`,
      categories: (count) => `श्रेणियां ${count}`,
      tags: (count) => `टैग ${count}`,
      activityLogs: (count) => `गतिविधि लॉग ${count}`,
      views: (count) => `दृश्य ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'टिप्पणी समीक्षा',
        description: (count) => (count > 0 ? `${count} टिप्पणियां समीक्षा की प्रतीक्षा में हैं` : 'कोई लंबित टिप्पणी नहीं'),
        action: (count) => (count > 0 ? 'समीक्षा करें' : 'टिप्पणियां देखें'),
      },
      scheduledPosts: {
        title: 'निर्धारित प्रकाशन',
        description: (count) => (count > 0 ? `${count} लेख अपने आप प्रकाशित होने की प्रतीक्षा में हैं` : 'कोई निर्धारित लेख नहीं'),
        action: (count) => (count > 0 ? 'समय-सारणी देखें' : 'लेख देखें'),
      },
      draftPosts: {
        title: 'ड्राफ्ट',
        description: (count) => (count > 0 ? `${count} ड्राफ्ट जारी रखे जा सकते हैं` : 'कोई अधूरा ड्राफ्ट नहीं'),
        action: (count) => (count > 0 ? 'संपादन जारी रखें' : 'लेख देखें'),
      },
      featuredPosts: {
        title: 'मुखपृष्ठ विशेष',
        description: (count) => (count > 0 ? `${count} लेख विशेष स्थानों में दिख रहे हैं` : 'मुखपृष्ठ विशेष लेख अभी सेट नहीं हैं'),
        action: (count) => (count > 0 ? 'विशेष संभालें' : 'विशेष सेट करें'),
      },
      contentStructure: {
        title: 'सामग्री संरचना',
        description: (categories, tags) => `${categories} श्रेणियां और ${tags} टैग बनाए गए`,
        action: 'संरचना व्यवस्थित करें',
      },
      mediaLibrary: {
        title: 'मीडिया लाइब्रेरी',
        description: (count) => (count > 0 ? `${count} पुन: उपयोग योग्य संसाधन हैं` : 'कोई मीडिया संसाधन अपलोड नहीं'),
        action: (count) => (count > 0 ? 'मीडिया संभालें' : 'संसाधन अपलोड करें'),
      },
    },
    quickActions: {
      newPost: { title: 'लेख लिखें', description: 'लेख, SEO जानकारी और निर्धारित प्रकाशन बनाएं' },
      pages: { title: 'पेज', description: 'परिचय, नेविगेशन और स्वतंत्र सामग्री संभालें' },
      media: { title: 'मीडिया', description: 'चित्र, PDF और पाठ सामग्री अपलोड करें' },
      comments: { title: 'टिप्पणियां', description: 'समीक्षा, उत्तर और संवाद साफ करें' },
    },
  },
  es: {
    loading: 'Cargando panel',
    title: 'Panel',
    subtitle: 'Resumen de contenido, interacción, medios y administración',
    reviewComments: 'Revisar comentarios',
    writePost: 'Escribir artículo',
    tasksTitle: 'Trabajo pendiente',
    tasksSubtitle: 'Operaciones diarias organizadas por comentarios, borradores, estructura y medios',
    quickTitle: 'Accesos rápidos',
    quickSubtitle: 'Entradas frecuentes de mantenimiento agrupadas aquí',
    metrics: {
      posts: 'Total de artículos',
      publishedPosts: 'Publicados',
      scheduledPosts: 'Programados',
      featuredPosts: 'Destacados',
      pendingComments: 'Comentarios pendientes',
      mediaAssets: 'Archivos multimedia',
      users: 'Usuarios admin',
    },
    tones: { urgent: 'Prioridad', active: 'Activo', calm: 'Normal' },
    chips: {
      drafts: (count) => `Borradores ${count}`,
      featured: (count) => `Destacados ${count}`,
      approvedComments: (count) => `Comentarios aprobados ${count}`,
      categories: (count) => `Categorías ${count}`,
      tags: (count) => `Etiquetas ${count}`,
      activityLogs: (count) => `Actividad ${count}`,
      views: (count) => `Vistas ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'Revisión de comentarios',
        description: (count) => (count > 0 ? `${count} comentarios esperan revisión` : 'No hay comentarios pendientes'),
        action: (count) => (count > 0 ? 'Revisar' : 'Ver comentarios'),
      },
      scheduledPosts: {
        title: 'Publicación programada',
        description: (count) => (count > 0 ? `${count} artículos esperan publicación automática` : 'No hay artículos programados'),
        action: (count) => (count > 0 ? 'Ver programa' : 'Ver artículos'),
      },
      draftPosts: {
        title: 'Borradores',
        description: (count) => (count > 0 ? `${count} borradores pueden continuar` : 'No hay borradores pendientes'),
        action: (count) => (count > 0 ? 'Continuar' : 'Ver artículos'),
      },
      featuredPosts: {
        title: 'Destacados de inicio',
        description: (count) => (count > 0 ? `${count} artículos se muestran como destacados` : 'No hay artículos destacados en inicio'),
        action: (count) => (count > 0 ? 'Mantener destacados' : 'Configurar destacados'),
      },
      contentStructure: {
        title: 'Estructura',
        description: (categories, tags) => `${categories} categorías y ${tags} etiquetas creadas`,
        action: 'Organizar',
      },
      mediaLibrary: {
        title: 'Biblioteca multimedia',
        description: (count) => (count > 0 ? `${count} recursos reutilizables disponibles` : 'No se han subido recursos multimedia'),
        action: (count) => (count > 0 ? 'Gestionar medios' : 'Subir recursos'),
      },
    },
    quickActions: {
      newPost: { title: 'Escribir artículo', description: 'Crear contenido, SEO y publicación programada' },
      pages: { title: 'Páginas', description: 'Mantener páginas de acerca, navegación y contenido independiente' },
      media: { title: 'Medios', description: 'Subir imágenes, PDF y archivos de texto' },
      comments: { title: 'Comentarios', description: 'Revisar, responder y limpiar interacciones' },
    },
  },
  ar: {
    loading: 'جار تحميل لوحة التحكم',
    title: 'لوحة التحكم',
    subtitle: 'نظرة على المحتوى والتفاعل والوسائط والإدارة',
    reviewComments: 'مراجعة التعليقات',
    writePost: 'كتابة مقال',
    tasksTitle: 'أعمال معلقة',
    tasksSubtitle: 'عمليات يومية حسب التعليقات والمسودات والبنية وحالة الوسائط',
    quickTitle: 'إجراءات سريعة',
    quickSubtitle: 'مداخل صيانة المحتوى المتكررة مجمعة هنا',
    metrics: {
      posts: 'إجمالي المقالات',
      publishedPosts: 'منشورة',
      scheduledPosts: 'مجدولة',
      featuredPosts: 'مميزة',
      pendingComments: 'تعليقات معلقة',
      mediaAssets: 'ملفات الوسائط',
      users: 'مستخدمو الإدارة',
    },
    tones: { urgent: 'أولوية', active: 'نشط', calm: 'طبيعي' },
    chips: {
      drafts: (count) => `مسودات ${count}`,
      featured: (count) => `مميزة ${count}`,
      approvedComments: (count) => `تعليقات مقبولة ${count}`,
      categories: (count) => `تصنيفات ${count}`,
      tags: (count) => `وسوم ${count}`,
      activityLogs: (count) => `سجل النشاط ${count}`,
      views: (count) => `مشاهدات ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'مراجعة التعليقات',
        description: (count) => (count > 0 ? `${count} تعليقات تنتظر المعالجة` : 'لا توجد تعليقات معلقة'),
        action: (count) => (count > 0 ? 'راجع الآن' : 'عرض التعليقات'),
      },
      scheduledPosts: {
        title: 'النشر المجدول',
        description: (count) => (count > 0 ? `${count} مقالات تنتظر النشر التلقائي` : 'لا توجد مقالات مجدولة'),
        action: (count) => (count > 0 ? 'عرض الجدول' : 'عرض المقالات'),
      },
      draftPosts: {
        title: 'المسودات',
        description: (count) => (count > 0 ? `${count} مسودات يمكن متابعتها` : 'لا توجد مسودات غير مكتملة'),
        action: (count) => (count > 0 ? 'متابعة التحرير' : 'عرض المقالات'),
      },
      featuredPosts: {
        title: 'مميز الصفحة الرئيسية',
        description: (count) => (count > 0 ? `${count} مقالات معروضة في أماكن مميزة` : 'لا توجد مقالات مميزة في الصفحة الرئيسية'),
        action: (count) => (count > 0 ? 'إدارة المميز' : 'تعيين المميز'),
      },
      contentStructure: {
        title: 'بنية المحتوى',
        description: (categories, tags) => `تم إنشاء ${categories} تصنيفات و ${tags} وسوم`,
        action: 'تنظيم البنية',
      },
      mediaLibrary: {
        title: 'مكتبة الوسائط',
        description: (count) => (count > 0 ? `${count} موارد قابلة لإعادة الاستخدام` : 'لم يتم رفع موارد وسائط بعد'),
        action: (count) => (count > 0 ? 'إدارة الوسائط' : 'رفع موارد'),
      },
    },
    quickActions: {
      newPost: { title: 'كتابة مقال', description: 'إنشاء مقال وبيانات SEO وجدولة النشر' },
      pages: { title: 'الصفحات', description: 'صيانة صفحات التعريف والتنقل والمحتوى المستقل' },
      media: { title: 'الوسائط', description: 'رفع الصور و PDF والملفات النصية' },
      comments: { title: 'التعليقات', description: 'المراجعة والرد وتنظيف التفاعل' },
    },
  },
  ru: {
    loading: 'Загрузка панели',
    title: 'Панель',
    subtitle: 'Обзор контента, взаимодействий, медиа и администрирования',
    reviewComments: 'Проверить комментарии',
    writePost: 'Написать статью',
    tasksTitle: 'Ожидающие задачи',
    tasksSubtitle: 'Ежедневные операции по комментариям, черновикам, структуре и медиа',
    quickTitle: 'Быстрые действия',
    quickSubtitle: 'Частые входы для обслуживания контента собраны здесь',
    metrics: {
      posts: 'Всего статей',
      publishedPosts: 'Опубликовано',
      scheduledPosts: 'Запланировано',
      featuredPosts: 'Избранное',
      pendingComments: 'Ожидают проверки',
      mediaAssets: 'Медиафайлы',
      users: 'Пользователи админки',
    },
    tones: { urgent: 'Приоритет', active: 'В работе', calm: 'Норма' },
    chips: {
      drafts: (count) => `Черновики ${count}`,
      featured: (count) => `Избранное ${count}`,
      approvedComments: (count) => `Одобренные комментарии ${count}`,
      categories: (count) => `Категории ${count}`,
      tags: (count) => `Теги ${count}`,
      activityLogs: (count) => `Журнал ${count}`,
      views: (count) => `Просмотры ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'Проверка комментариев',
        description: (count) => (count > 0 ? `${count} комментариев ждут проверки` : 'Нет комментариев на проверке'),
        action: (count) => (count > 0 ? 'Проверить' : 'Смотреть комментарии'),
      },
      scheduledPosts: {
        title: 'Запланированная публикация',
        description: (count) => (count > 0 ? `${count} статей ждут автопубликации` : 'Нет запланированных статей'),
        action: (count) => (count > 0 ? 'Смотреть расписание' : 'Смотреть статьи'),
      },
      draftPosts: {
        title: 'Черновики',
        description: (count) => (count > 0 ? `${count} черновиков можно продолжить` : 'Нет незавершенных черновиков'),
        action: (count) => (count > 0 ? 'Продолжить' : 'Смотреть статьи'),
      },
      featuredPosts: {
        title: 'Избранное на главной',
        description: (count) => (count > 0 ? `${count} статей показаны в избранном` : 'Избранные статьи на главной не заданы'),
        action: (count) => (count > 0 ? 'Управлять избранным' : 'Задать избранное'),
      },
      contentStructure: {
        title: 'Структура контента',
        description: (categories, tags) => `Создано категорий: ${categories}, тегов: ${tags}`,
        action: 'Организовать',
      },
      mediaLibrary: {
        title: 'Медиатека',
        description: (count) => (count > 0 ? `${count} ресурсов доступны для повторного использования` : 'Медиа еще не загружены'),
        action: (count) => (count > 0 ? 'Управлять медиа' : 'Загрузить'),
      },
    },
    quickActions: {
      newPost: { title: 'Написать статью', description: 'Создать контент, SEO и расписание публикации' },
      pages: { title: 'Страницы', description: 'Поддерживать страницы, навигацию и отдельный контент' },
      media: { title: 'Медиа', description: 'Загрузить изображения, PDF и текстовые материалы' },
      comments: { title: 'Комментарии', description: 'Проверять, отвечать и очищать взаимодействия' },
    },
  },
  pt: {
    loading: 'Carregando painel',
    title: 'Painel',
    subtitle: 'Visão de conteúdo, engajamento, mídia e administração',
    reviewComments: 'Revisar comentários',
    writePost: 'Escrever post',
    tasksTitle: 'Trabalho pendente',
    tasksSubtitle: 'Operações diárias por comentários, rascunhos, estrutura e mídia',
    quickTitle: 'Ações rápidas',
    quickSubtitle: 'Atalhos frequentes de manutenção de conteúdo ficam aqui',
    metrics: {
      posts: 'Total de posts',
      publishedPosts: 'Publicados',
      scheduledPosts: 'Agendados',
      featuredPosts: 'Destaques',
      pendingComments: 'Comentários pendentes',
      mediaAssets: 'Arquivos de mídia',
      users: 'Usuários admin',
    },
    tones: { urgent: 'Prioridade', active: 'Ativo', calm: 'Normal' },
    chips: {
      drafts: (count) => `Rascunhos ${count}`,
      featured: (count) => `Destaques ${count}`,
      approvedComments: (count) => `Comentários aprovados ${count}`,
      categories: (count) => `Categorias ${count}`,
      tags: (count) => `Tags ${count}`,
      activityLogs: (count) => `Atividade ${count}`,
      views: (count) => `Visualizações ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'Revisão de comentários',
        description: (count) => (count > 0 ? `${count} comentários aguardam revisão` : 'Nenhum comentário pendente'),
        action: (count) => (count > 0 ? 'Revisar' : 'Ver comentários'),
      },
      scheduledPosts: {
        title: 'Publicação agendada',
        description: (count) => (count > 0 ? `${count} posts aguardam publicação automática` : 'Nenhum post agendado'),
        action: (count) => (count > 0 ? 'Ver agenda' : 'Ver posts'),
      },
      draftPosts: {
        title: 'Rascunhos',
        description: (count) => (count > 0 ? `${count} rascunhos podem continuar` : 'Nenhum rascunho inacabado'),
        action: (count) => (count > 0 ? 'Continuar' : 'Ver posts'),
      },
      featuredPosts: {
        title: 'Destaques da home',
        description: (count) => (count > 0 ? `${count} posts aparecem nos destaques` : 'Nenhum post destacado na home'),
        action: (count) => (count > 0 ? 'Manter destaques' : 'Definir destaques'),
      },
      contentStructure: {
        title: 'Estrutura',
        description: (categories, tags) => `${categories} categorias e ${tags} tags criadas`,
        action: 'Organizar',
      },
      mediaLibrary: {
        title: 'Biblioteca de mídia',
        description: (count) => (count > 0 ? `${count} recursos reutilizáveis disponíveis` : 'Nenhum recurso de mídia enviado'),
        action: (count) => (count > 0 ? 'Gerenciar mídia' : 'Enviar recursos'),
      },
    },
    quickActions: {
      newPost: { title: 'Escrever post', description: 'Criar conteúdo, SEO e publicação agendada' },
      pages: { title: 'Páginas', description: 'Manter páginas sobre, navegação e conteúdo independente' },
      media: { title: 'Mídia', description: 'Enviar imagens, PDF e textos' },
      comments: { title: 'Comentários', description: 'Revisar, responder e limpar interações' },
    },
  },
  eo: {
    loading: 'Ŝargante panelon',
    title: 'Panelo',
    subtitle: 'Superrigardo pri enhavo, interagoj, mediaĵoj kaj administrado',
    reviewComments: 'Kontroli komentojn',
    writePost: 'Skribi afiŝon',
    tasksTitle: 'Atendantaj laboroj',
    tasksSubtitle: 'Ĉiutagaj agoj laŭ komentoj, malnetoj, strukturo kaj media stato',
    quickTitle: 'Rapidaj agoj',
    quickSubtitle: 'Oftaj enhav-prizorgaj enirejoj estas grupigitaj ĉi tie',
    metrics: {
      posts: 'Sumo de afiŝoj',
      publishedPosts: 'Publikigitaj',
      scheduledPosts: 'Planitaj',
      featuredPosts: 'Elstarigitaj',
      pendingComments: 'Atendantaj komentoj',
      mediaAssets: 'Media dosieroj',
      users: 'Administraj uzantoj',
    },
    tones: { urgent: 'Prioritata', active: 'Aktiva', calm: 'Normala' },
    chips: {
      drafts: (count) => `Malnetoj ${count}`,
      featured: (count) => `Elstarigitaj ${count}`,
      approvedComments: (count) => `Aprobitaj komentoj ${count}`,
      categories: (count) => `Kategorioj ${count}`,
      tags: (count) => `Etikedoj ${count}`,
      activityLogs: (count) => `Agadaj protokoloj ${count}`,
      views: (count) => `Vidoj ${count}`,
    },
    tasks: {
      pendingComments: {
        title: 'Koment-kontrolo',
        description: (count) => (count > 0 ? `${count} komentoj atendas kontrolon` : 'Neniuj komentoj atendas'),
        action: (count) => (count > 0 ? 'Kontroli' : 'Vidi komentojn'),
      },
      scheduledPosts: {
        title: 'Planita publikigo',
        description: (count) => (count > 0 ? `${count} afiŝoj atendas aŭtomatan publikigon` : 'Neniuj planitaj afiŝoj'),
        action: (count) => (count > 0 ? 'Vidi planon' : 'Vidi afiŝojn'),
      },
      draftPosts: {
        title: 'Malnetoj',
        description: (count) => (count > 0 ? `${count} malnetoj povas daŭri` : 'Neniuj nefinitaj malnetoj'),
        action: (count) => (count > 0 ? 'Daŭrigi redakton' : 'Vidi afiŝojn'),
      },
      featuredPosts: {
        title: 'Hejmpaĝaj elstarigoj',
        description: (count) => (count > 0 ? `${count} afiŝoj aperas en elstarigitaj lokoj` : 'Neniuj hejmpaĝaj elstarigoj ankoraŭ'),
        action: (count) => (count > 0 ? 'Prizorgi elstarigojn' : 'Agordi elstarigojn'),
      },
      contentStructure: {
        title: 'Enhava strukturo',
        description: (categories, tags) => `${categories} kategorioj kaj ${tags} etikedoj kreitaj`,
        action: 'Organizi strukturon',
      },
      mediaLibrary: {
        title: 'Media biblioteko',
        description: (count) => (count > 0 ? `${count} reuzeblaj rimedoj disponeblas` : 'Neniuj mediaj rimedoj alŝutitaj'),
        action: (count) => (count > 0 ? 'Administri mediaĵojn' : 'Alŝuti rimedojn'),
      },
    },
    quickActions: {
      newPost: { title: 'Skribi afiŝon', description: 'Krei enhavon, SEO-informojn kaj planitan publikigon' },
      pages: { title: 'Paĝoj', description: 'Prizorgi pri-paĝojn, navigadon kaj sendependan enhavon' },
      media: { title: 'Mediaĵoj', description: 'Alŝuti bildojn, PDF-ojn kaj tekstajn materialojn' },
      comments: { title: 'Komentoj', description: 'Kontroli, respondi kaj purigi interagojn' },
    },
  },
}

export function dashboardUIText(languageCode?: string | null) {
  const code = normalizeLanguageCode(languageCode)
  return dashboardTextByLanguage[code] ?? defaultDashboardText
}

export function dashboardTasks(stats: DashboardStats, text: DashboardText = defaultDashboardText): DashboardTask[] {
  return [
    {
      key: 'pending-comments',
      title: text.tasks.pendingComments.title,
      description: text.tasks.pendingComments.description(stats.pendingComments),
      action: text.tasks.pendingComments.action(stats.pendingComments),
      href: '/admin/comments?status=pending',
      count: stats.pendingComments,
      tone: stats.pendingComments > 0 ? 'urgent' : 'calm',
    },
    {
      key: 'scheduled-posts',
      title: text.tasks.scheduledPosts.title,
      description: text.tasks.scheduledPosts.description(stats.scheduledPosts),
      action: text.tasks.scheduledPosts.action(stats.scheduledPosts),
      href: '/admin/posts?scheduled=1',
      count: stats.scheduledPosts,
      tone: stats.scheduledPosts > 0 ? 'active' : 'calm',
    },
    {
      key: 'draft-posts',
      title: text.tasks.draftPosts.title,
      description: text.tasks.draftPosts.description(stats.draftPosts),
      action: text.tasks.draftPosts.action(stats.draftPosts),
      href: '/admin/posts?status=draft',
      count: stats.draftPosts,
      tone: stats.draftPosts > 0 ? 'active' : 'calm',
    },
    {
      key: 'featured-posts',
      title: text.tasks.featuredPosts.title,
      description: text.tasks.featuredPosts.description(stats.featuredPosts),
      action: text.tasks.featuredPosts.action(stats.featuredPosts),
      href: stats.featuredPosts > 0 ? '/admin/posts?featured=1' : '/admin/posts',
      count: stats.featuredPosts,
      tone: stats.featuredPosts > 0 ? 'calm' : 'active',
    },
    {
      key: 'content-structure',
      title: text.tasks.contentStructure.title,
      description: text.tasks.contentStructure.description(stats.categories, stats.tags),
      action: text.tasks.contentStructure.action,
      href: '/admin/taxonomy',
      count: stats.categories + stats.tags,
      tone: stats.categories === 0 || stats.tags === 0 ? 'active' : 'calm',
    },
    {
      key: 'media-library',
      title: text.tasks.mediaLibrary.title,
      description: text.tasks.mediaLibrary.description(stats.mediaAssets),
      action: text.tasks.mediaLibrary.action(stats.mediaAssets),
      href: '/admin/media',
      count: stats.mediaAssets,
      tone: stats.mediaAssets > 0 ? 'calm' : 'active',
    },
  ]
}

export function dashboardQuickActions(text: DashboardText = defaultDashboardText): DashboardQuickAction[] {
  return [
    {
      key: 'new-post',
      title: text.quickActions.newPost.title,
      description: text.quickActions.newPost.description,
      href: '/admin/posts/new',
    },
    {
      key: 'pages',
      title: text.quickActions.pages.title,
      description: text.quickActions.pages.description,
      href: '/admin/pages',
    },
    {
      key: 'media',
      title: text.quickActions.media.title,
      description: text.quickActions.media.description,
      href: '/admin/media',
    },
    {
      key: 'comments',
      title: text.quickActions.comments.title,
      description: text.quickActions.comments.description,
      href: '/admin/comments',
    },
  ]
}
