package models

import "time"

type User struct {
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	DisplayName  string     `json:"displayName"`
	PasswordHash string     `json:"-"`
	Role         string     `json:"role"`
	Status       string     `json:"status"`
	TokenVersion int        `json:"-"`
	LastLoginAt  *time.Time `json:"lastLoginAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type UserInput struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

type BackupUser struct {
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	DisplayName  string     `json:"displayName"`
	PasswordHash string     `json:"passwordHash,omitempty"`
	Role         string     `json:"role"`
	Status       string     `json:"status"`
	TokenVersion int        `json:"tokenVersion,omitempty"`
	LastLoginAt  *time.Time `json:"lastLoginAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type UserFilter struct {
	Query  string
	Role   string
	Status string
	Limit  int
	Offset int
}

type PaginatedUsers struct {
	Items  []User `json:"items"`
	Total  int    `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}

type AccountProfileInput struct {
	DisplayName string `json:"displayName"`
}

type AccountPasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type Category struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Description    string    `json:"description"`
	SortOrder      int       `json:"sortOrder"`
	PostCount      int       `json:"postCount"`
	ReferenceCount int       `json:"referenceCount"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Tag struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	PostCount      int       `json:"postCount"`
	ReferenceCount int       `json:"referenceCount"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Post struct {
	ID             string     `json:"id"`
	Title          string     `json:"title"`
	Slug           string     `json:"slug"`
	Excerpt        string     `json:"excerpt"`
	Content        string     `json:"content"`
	SourceLanguage string     `json:"sourceLanguage"`
	CoverURL       string     `json:"coverUrl"`
	Status         string     `json:"status"`
	Featured       bool       `json:"featured"`
	SEOTitle       string     `json:"seoTitle"`
	SEODescription string     `json:"seoDescription"`
	AuthorID       string     `json:"authorId"`
	AuthorName     string     `json:"authorName"`
	ViewCount      int        `json:"viewCount"`
	CommentCount   int        `json:"commentCount"`
	Categories     []Category `json:"categories"`
	Tags           []Tag      `json:"tags"`
	PublishedAt    *time.Time `json:"publishedAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	DeletedAt      *time.Time `json:"deletedAt"`
}

type PostInput struct {
	Title          string     `json:"title"`
	Slug           string     `json:"slug"`
	Excerpt        string     `json:"excerpt"`
	Content        string     `json:"content"`
	SourceLanguage string     `json:"sourceLanguage"`
	CoverURL       string     `json:"coverUrl"`
	Status         string     `json:"status"`
	Featured       bool       `json:"featured"`
	SEOTitle       string     `json:"seoTitle"`
	SEODescription string     `json:"seoDescription"`
	CategoryIDs    []string   `json:"categoryIds"`
	TagIDs         []string   `json:"tagIds"`
	PublishedAt    *time.Time `json:"publishedAt"`
}

type ArchivePost struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Slug           string    `json:"slug"`
	Excerpt        string    `json:"excerpt"`
	SourceLanguage string    `json:"-"`
	SourceHash     string    `json:"-"`
	PublishedAt    time.Time `json:"publishedAt"`
	ViewCount      int       `json:"viewCount"`
	CommentCount   int       `json:"commentCount"`
}

type ArchiveMonth struct {
	Month     int           `json:"month"`
	PostCount int           `json:"postCount"`
	Posts     []ArchivePost `json:"posts"`
}

type ArchiveYear struct {
	Year      int            `json:"year"`
	PostCount int            `json:"postCount"`
	Months    []ArchiveMonth `json:"months"`
}

type Page struct {
	ID             string     `json:"id"`
	Title          string     `json:"title"`
	Slug           string     `json:"slug"`
	Content        string     `json:"content"`
	Status         string     `json:"status"`
	ShowInNav      bool       `json:"showInNav"`
	NavLabel       string     `json:"navLabel"`
	SortOrder      int        `json:"sortOrder"`
	SEOTitle       string     `json:"seoTitle"`
	SEODescription string     `json:"seoDescription"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	DeletedAt      *time.Time `json:"deletedAt"`
}

type PageInput struct {
	Title          string `json:"title"`
	Slug           string `json:"slug"`
	Content        string `json:"content"`
	Status         string `json:"status"`
	ShowInNav      bool   `json:"showInNav"`
	NavLabel       string `json:"navLabel"`
	SortOrder      int    `json:"sortOrder"`
	SEOTitle       string `json:"seoTitle"`
	SEODescription string `json:"seoDescription"`
}

type PageRevision struct {
	ID             string    `json:"id"`
	PageID         string    `json:"pageId"`
	VersionNumber  int       `json:"versionNumber"`
	Title          string    `json:"title"`
	Slug           string    `json:"slug"`
	Content        string    `json:"content"`
	Status         string    `json:"status"`
	ShowInNav      bool      `json:"showInNav"`
	NavLabel       string    `json:"navLabel"`
	SortOrder      int       `json:"sortOrder"`
	SEOTitle       string    `json:"seoTitle"`
	SEODescription string    `json:"seoDescription"`
	CreatedBy      string    `json:"createdBy"`
	CreatedAt      time.Time `json:"createdAt"`
}

type PostRevision struct {
	ID             string     `json:"id"`
	PostID         string     `json:"postId"`
	VersionNumber  int        `json:"versionNumber"`
	Title          string     `json:"title"`
	Slug           string     `json:"slug"`
	Excerpt        string     `json:"excerpt"`
	Content        string     `json:"content"`
	SourceLanguage string     `json:"sourceLanguage"`
	CoverURL       string     `json:"coverUrl"`
	Status         string     `json:"status"`
	Featured       bool       `json:"featured"`
	SEOTitle       string     `json:"seoTitle"`
	SEODescription string     `json:"seoDescription"`
	CategoryIDs    []string   `json:"categoryIds"`
	TagIDs         []string   `json:"tagIds"`
	PublishedAt    *time.Time `json:"publishedAt"`
	CreatedBy      string     `json:"createdBy"`
	CreatedAt      time.Time  `json:"createdAt"`
}

type Comment struct {
	ID               string    `json:"id"`
	PostID           string    `json:"postId"`
	PostTitle        string    `json:"postTitle"`
	PostSlug         string    `json:"postSlug"`
	ParentID         string    `json:"parentId"`
	ParentAuthorName string    `json:"parentAuthorName"`
	AuthorUserID     string    `json:"authorUserId"`
	IsAdminReply     bool      `json:"isAdminReply"`
	AuthorName       string    `json:"authorName"`
	Email            string    `json:"email"`
	Website          string    `json:"website"`
	Content          string    `json:"content"`
	Status           string    `json:"status"`
	IPAddress        string    `json:"ipAddress"`
	UserAgent        string    `json:"userAgent"`
	CreatedAt        time.Time `json:"createdAt"`
}

type CommentFilter struct {
	Query  string
	Status string
	Limit  int
	Offset int
}

type PaginatedComments struct {
	Items  []Comment `json:"items"`
	Total  int       `json:"total"`
	Limit  int       `json:"limit"`
	Offset int       `json:"offset"`
}

type CommentInput struct {
	AuthorName string `json:"authorName"`
	Email      string `json:"email"`
	Website    string `json:"website"`
	Content    string `json:"content"`
	ParentID   string `json:"parentId"`
}

type DashboardStats struct {
	Posts            int `json:"posts"`
	PublishedPosts   int `json:"publishedPosts"`
	ScheduledPosts   int `json:"scheduledPosts"`
	FeaturedPosts    int `json:"featuredPosts"`
	DraftPosts       int `json:"draftPosts"`
	PendingComments  int `json:"pendingComments"`
	ApprovedComments int `json:"approvedComments"`
	Categories       int `json:"categories"`
	Tags             int `json:"tags"`
	Views            int `json:"views"`
	Users            int `json:"users"`
	MediaAssets      int `json:"mediaAssets"`
	ActivityLogs     int `json:"activityLogs"`
}

type DailyView struct {
	Date  string `json:"date"`
	Views int    `json:"views"`
}

type PopularPost struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
	Views int    `json:"views"`
}

type AnalyticsSummary struct {
	TotalViews   int           `json:"totalViews"`
	TodayViews   int           `json:"todayViews"`
	DailyViews   []DailyView   `json:"dailyViews"`
	PopularPosts []PopularPost `json:"popularPosts"`
}

type PostFilter struct {
	Query     string
	Status    string
	Category  string
	Tag       string
	Featured  *bool
	Limit     int
	Offset    int
	Admin     bool
	Deleted   bool
	Scheduled bool
}

type PaginatedPosts struct {
	Items  []Post `json:"items"`
	Total  int    `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}

type PageFilter struct {
	Admin          bool
	Deleted        bool
	IncludeDeleted bool
	Query          string
	Status         string
	Nav            string
	Limit          int
	Offset         int
}

type PaginatedPages struct {
	Items  []Page `json:"items"`
	Total  int    `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}

type ActivityLog struct {
	ID            string         `json:"id"`
	ActorID       string         `json:"actorId"`
	ActorUsername string         `json:"actorUsername"`
	Action        string         `json:"action"`
	EntityType    string         `json:"entityType"`
	EntityID      string         `json:"entityId"`
	Detail        map[string]any `json:"detail"`
	IPAddress     string         `json:"ipAddress"`
	UserAgent     string         `json:"userAgent"`
	CreatedAt     time.Time      `json:"createdAt"`
}

type ActivityLogFilter struct {
	Query      string
	Action     string
	EntityType string
	Limit      int
	Offset     int
}

type PaginatedActivityLogs struct {
	Items  []ActivityLog `json:"items"`
	Total  int           `json:"total"`
	Limit  int           `json:"limit"`
	Offset int           `json:"offset"`
}

type ActivityLogInput struct {
	ActorID       string
	ActorUsername string
	Action        string
	EntityType    string
	EntityID      string
	Detail        map[string]any
	IPAddress     string
	UserAgent     string
}

type PostViewStat struct {
	Day       string `json:"day"`
	PostID    string `json:"postId"`
	PostTitle string `json:"postTitle"`
	PostSlug  string `json:"postSlug"`
	Views     int    `json:"views"`
}

type PostTranslationSegment struct {
	Index          int    `json:"index"`
	SourceText     string `json:"sourceText"`
	TranslatedText string `json:"translatedText"`
}

type PostTranslation struct {
	ID             string                   `json:"id"`
	PostID         string                   `json:"postId"`
	LanguageCode   string                   `json:"languageCode"`
	SourceLanguage string                   `json:"sourceLanguage"`
	SourceHash     string                   `json:"sourceHash"`
	Title          string                   `json:"title"`
	Excerpt        string                   `json:"excerpt"`
	Content        string                   `json:"content"`
	Segments       []PostTranslationSegment `json:"segments"`
	CreatedAt      time.Time                `json:"createdAt"`
	UpdatedAt      time.Time                `json:"updatedAt"`
}

type TranslationCacheFilter struct {
	Query          string
	LanguageCode   string
	SourceLanguage string
	Limit          int
	Offset         int
}

type TranslationCacheItem struct {
	ID             string     `json:"id"`
	CacheID        string     `json:"cacheId"`
	JobID          string     `json:"jobId"`
	PostID         string     `json:"postId"`
	PostTitle      string     `json:"postTitle"`
	PostSlug       string     `json:"postSlug"`
	PostStatus     string     `json:"postStatus"`
	LanguageCode   string     `json:"languageCode"`
	SourceLanguage string     `json:"sourceLanguage"`
	SourceHash     string     `json:"sourceHash"`
	HasCache       bool       `json:"hasCache"`
	Stale          bool       `json:"stale"`
	SegmentCount   int        `json:"segmentCount"`
	ContentBytes   int        `json:"contentBytes"`
	JobStatus      string     `json:"jobStatus"`
	JobError       string     `json:"jobError"`
	JobStartedAt   *time.Time `json:"jobStartedAt"`
	JobFinishedAt  *time.Time `json:"jobFinishedAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type PostTranslationJob struct {
	ID             string     `json:"id,omitempty"`
	PostID         string     `json:"postId"`
	LanguageCode   string     `json:"languageCode"`
	SourceLanguage string     `json:"sourceLanguage"`
	SourceHash     string     `json:"sourceHash"`
	Status         string     `json:"status"`
	ErrorMessage   string     `json:"errorMessage"`
	StartedAt      *time.Time `json:"startedAt,omitempty"`
	FinishedAt     *time.Time `json:"finishedAt,omitempty"`
	CreatedAt      time.Time  `json:"createdAt,omitempty"`
	UpdatedAt      time.Time  `json:"updatedAt,omitempty"`
}

type PaginatedTranslationCaches struct {
	Items  []TranslationCacheItem `json:"items"`
	Total  int                    `json:"total"`
	Limit  int                    `json:"limit"`
	Offset int                    `json:"offset"`
}

type MediaAsset struct {
	ID             string    `json:"id"`
	Filename       string    `json:"filename"`
	OriginalName   string    `json:"originalName"`
	MimeType       string    `json:"mimeType"`
	SizeBytes      int64     `json:"sizeBytes"`
	URL            string    `json:"url"`
	AltText        string    `json:"altText"`
	UploadedBy     string    `json:"uploadedBy"`
	ReferenceCount int       `json:"referenceCount"`
	ContentBase64  string    `json:"contentBase64,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

type MediaAssetInput struct {
	Filename     string
	OriginalName string
	MimeType     string
	SizeBytes    int64
	URL          string
	AltText      string
	UploadedBy   string
}

type MediaAssetFilter struct {
	Query    string
	Kind     string
	MimeType string
	Limit    int
	Offset   int
}

type PaginatedMediaAssets struct {
	Items  []MediaAsset `json:"items"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

type SystemDatabaseStatus struct {
	Status        string `json:"status"`
	LatencyMs     int64  `json:"latencyMs"`
	TotalConns    int32  `json:"totalConns"`
	AcquiredConns int32  `json:"acquiredConns"`
	IdleConns     int32  `json:"idleConns"`
}

type SystemStorageStatus struct {
	Status     string `json:"status"`
	UploadDir  string `json:"uploadDir"`
	Exists     bool   `json:"exists"`
	Writable   bool   `json:"writable"`
	FileCount  int    `json:"fileCount"`
	TotalBytes int64  `json:"totalBytes"`
}

type SystemContentStats struct {
	Posts                  int `json:"posts"`
	TrashedPosts           int `json:"trashedPosts"`
	Pages                  int `json:"pages"`
	TrashedPages           int `json:"trashedPages"`
	MediaAssets            int `json:"mediaAssets"`
	Comments               int `json:"comments"`
	Users                  int `json:"users"`
	ActivityLogs           int `json:"activityLogs"`
	TranslationCaches      int `json:"translationCaches"`
	StaleTranslationCaches int `json:"staleTranslationCaches"`
	TranslationJobs        int `json:"translationJobs"`
	RunningTranslationJobs int `json:"runningTranslationJobs"`
	FailedTranslationJobs  int `json:"failedTranslationJobs"`
}

type SystemLanguage struct {
	Code       string `json:"code"`
	Flag       string `json:"flag"`
	NativeName string `json:"nativeName"`
	RTL        bool   `json:"rtl"`
}

type SystemTranslationStatus struct {
	Enabled            bool             `json:"enabled"`
	Provider           string           `json:"provider"`
	Model              string           `json:"model"`
	APIKeyConfigured   bool             `json:"apiKeyConfigured"`
	CacheCount         int              `json:"cacheCount"`
	StaleCacheCount    int              `json:"staleCacheCount"`
	JobCount           int              `json:"jobCount"`
	RunningJobCount    int              `json:"runningJobCount"`
	FailedJobCount     int              `json:"failedJobCount"`
	SupportedLanguages []SystemLanguage `json:"supportedLanguages"`
}

type SystemRuntimeStatus struct {
	GoVersion     string    `json:"goVersion"`
	OS            string    `json:"os"`
	Arch          string    `json:"arch"`
	ProcessID     int       `json:"processId"`
	StartedAt     time.Time `json:"startedAt"`
	UptimeSeconds int64     `json:"uptimeSeconds"`
}

type SystemDeploymentCheck struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	OK       bool   `json:"ok"`
	Severity string `json:"severity"`
	Detail   string `json:"detail"`
}

type SystemDeploymentStatus struct {
	Status string                  `json:"status"`
	Checks []SystemDeploymentCheck `json:"checks"`
}

type SystemStatus struct {
	GeneratedAt time.Time               `json:"generatedAt"`
	Database    SystemDatabaseStatus    `json:"database"`
	Storage     SystemStorageStatus     `json:"storage"`
	Content     SystemContentStats      `json:"content"`
	Translation SystemTranslationStatus `json:"translation"`
	Runtime     SystemRuntimeStatus     `json:"runtime"`
	Deployment  SystemDeploymentStatus  `json:"deployment"`
}

type FriendLink struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	URL         string    `json:"url"`
	Description string    `json:"description"`
	LogoURL     string    `json:"logoUrl"`
	Status      string    `json:"status"`
	SortOrder   int       `json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type FriendLinkInput struct {
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	LogoURL     string `json:"logoUrl"`
	Status      string `json:"status"`
	SortOrder   int    `json:"sortOrder"`
}

type BackupSnapshot struct {
	ExportedAt          time.Time            `json:"exportedAt"`
	Settings            map[string]any       `json:"settings"`
	Users               []BackupUser         `json:"users"`
	Posts               []Post               `json:"posts"`
	Pages               []Page               `json:"pages"`
	Categories          []Category           `json:"categories"`
	Tags                []Tag                `json:"tags"`
	Comments            []Comment            `json:"comments"`
	MediaAssets         []MediaAsset         `json:"mediaAssets"`
	ActivityLogs        []ActivityLog        `json:"activityLogs"`
	PostRevisions       []PostRevision       `json:"postRevisions"`
	PageRevisions       []PageRevision       `json:"pageRevisions"`
	PostTranslations    []PostTranslation    `json:"postTranslations"`
	PostTranslationJobs []PostTranslationJob `json:"postTranslationJobs,omitempty"`
	FriendLinks         []FriendLink         `json:"friendLinks"`
	ViewStats           []PostViewStat       `json:"viewStats"`
}

type BackupImportResult struct {
	Settings            int `json:"settings"`
	Users               int `json:"users"`
	Categories          int `json:"categories"`
	Tags                int `json:"tags"`
	Posts               int `json:"posts"`
	Pages               int `json:"pages"`
	Comments            int `json:"comments"`
	MediaAssets         int `json:"mediaAssets"`
	PostRevisions       int `json:"postRevisions"`
	PageRevisions       int `json:"pageRevisions"`
	PostTranslations    int `json:"postTranslations"`
	PostTranslationJobs int `json:"postTranslationJobs"`
	FriendLinks         int `json:"friendLinks"`
	ViewStats           int `json:"viewStats"`
	ActivityLogs        int `json:"activityLogs"`
}
