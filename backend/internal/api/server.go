package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"mime"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"purecms/backend/internal/auth"
	"purecms/backend/internal/config"
	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
	"purecms/backend/internal/moderation"
	"purecms/backend/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type contextKey string

const claimsKey contextKey = "claims"
const maxAuditUsernameRunes = 120
const defaultCommentRateLimitMinutes = 10
const defaultCommentRateLimitMax = 5
const maxCommentRateLimitMinutes = 1440
const maxCommentRateLimitMax = 100
const maxJSONBodyBytes int64 = 2 << 20
const maxBackupImportBytes int64 = 50 << 20
const translationTargetConcurrency = 3
const translationSegmentConcurrency = 4
const postAutoTranslationTimeout = 10 * time.Minute
const translationSettingsNotReadyMessage = "AI translation settings are disabled or incomplete; configure translation settings and queue missing translations again."

var errUserDisabled = errors.New("user disabled")
var errTokenVersionStale = errors.New("token version stale")

type Server struct {
	cfg          config.Config
	store        store.Store
	auth         auth.Service
	loginLimiter *loginAttemptLimiter
	startedAt    time.Time
}

type adminOnlyRouteSpec struct {
	Method  string
	Pattern string
	Handler http.HandlerFunc
}

type commentPolicy struct {
	Enabled         bool
	Moderation      bool
	SpamKeywords    []string
	RateLimitWindow time.Duration
	RateLimitMax    int
}

func New(cfg config.Config, store store.Store, authService auth.Service) Server {
	return Server{
		cfg:          cfg,
		store:        store,
		auth:         authService,
		loginLimiter: newLoginAttemptLimiter(time.Duration(cfg.LoginRateLimitWindowMinutes)*time.Minute, cfg.LoginRateLimitMax),
		startedAt:    time.Now().UTC(),
	}
}

func (s Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(securityHeaders)
	r.Use(s.cors)
	r.Use(s.recoverer)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", uploadsFileServer(s.cfg.UploadDir)))
	r.Get("/robots.txt", s.robots)
	r.With(s.publicMaintenanceGate).Get("/rss.xml", s.rss)
	r.With(s.publicMaintenanceGate).Get("/sitemap.xml", s.sitemap)

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", s.health)
		r.Get("/site", s.site)
		r.Post("/auth/login", s.login)
		r.Group(func(r chi.Router) {
			r.Use(s.publicMaintenanceGate)
			r.Get("/posts", s.listPublicPosts)
			r.Get("/posts/{slug}", s.getPublicPost)
			r.Get("/posts/{slug}/translation", s.getPublicPostTranslation)
			r.Get("/posts/{id}/comments", s.listPublicComments)
			r.Post("/posts/{id}/comments", s.createComment)
			r.Get("/archives", s.listArchives)
			r.Get("/pages", s.listPublicPages)
			r.Get("/pages/{slug}", s.getPublicPage)
			r.Get("/categories", s.listCategories)
			r.Get("/tags", s.listTags)
			r.Get("/friend-links", s.listPublicFriendLinks)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(s.requireAuth)
			r.Post("/logout", s.logout)
			r.Get("/me", s.me)
			r.Put("/me/profile", s.updateMyProfile)
			r.Put("/me/password", s.updateMyPassword)
			r.Get("/dashboard", s.dashboard)
			r.Get("/analytics", s.analytics)
			r.Get("/posts", s.listAdminPosts)
			r.Post("/posts", s.createPost)
			r.Get("/posts/{id}", s.getAdminPost)
			r.Put("/posts/{id}", s.updatePost)
			r.Delete("/posts/{id}", s.deletePost)
			r.Post("/posts/{id}/restore", s.restorePost)
			r.Get("/posts/{id}/revisions", s.listPostRevisions)
			r.Post("/posts/{id}/revisions/{revisionId}/restore", s.restorePostRevision)
			r.Get("/pages", s.listAdminPages)
			r.Post("/pages", s.createPage)
			r.Get("/pages/{id}", s.getAdminPage)
			r.Put("/pages/{id}", s.updatePage)
			r.Delete("/pages/{id}", s.deletePage)
			r.Post("/pages/{id}/restore", s.restorePage)
			r.Get("/pages/{id}/revisions", s.listPageRevisions)
			r.Post("/pages/{id}/revisions/{revisionId}/restore", s.restorePageRevision)
			r.Get("/categories", s.listCategories)
			r.Post("/categories", s.createCategory)
			r.Put("/categories/{id}", s.updateCategory)
			r.Delete("/categories/{id}", s.deleteCategory)
			r.Get("/tags", s.listTags)
			r.Post("/tags", s.createTag)
			r.Put("/tags/{id}", s.updateTag)
			r.Delete("/tags/{id}", s.deleteTag)
			r.Get("/friend-links", s.listAdminFriendLinks)
			r.Post("/friend-links", s.createFriendLink)
			r.Put("/friend-links/{id}", s.updateFriendLink)
			r.Delete("/friend-links/{id}", s.deleteFriendLink)
			r.Get("/comments", s.listComments)
			r.Put("/comments/{id}/moderate", s.moderateComment)
			r.Post("/comments/{id}/reply", s.replyComment)
			r.Delete("/comments/{id}", s.deleteComment)
			r.Get("/media", s.listMedia)
			r.Post("/media", s.uploadMedia)
			r.Put("/media/{id}", s.updateMediaAltText)
			r.Delete("/media/{id}", s.deleteMedia)
			r.Group(func(r chi.Router) {
				s.mountAdminOnlyRoutes(r)
			})
		})
	})

	return r
}

func (s Server) adminOnlyRoutes() []adminOnlyRouteSpec {
	return []adminOnlyRouteSpec{
		{Method: http.MethodGet, Pattern: "/users", Handler: s.listUsers},
		{Method: http.MethodPost, Pattern: "/users", Handler: s.createUser},
		{Method: http.MethodPut, Pattern: "/users/{id}", Handler: s.updateUser},
		{Method: http.MethodPut, Pattern: "/users/{id}/password", Handler: s.updateUserPassword},
		{Method: http.MethodDelete, Pattern: "/users/{id}", Handler: s.deleteUser},
		{Method: http.MethodDelete, Pattern: "/posts/{id}/permanent", Handler: s.permanentlyDeletePost},
		{Method: http.MethodDelete, Pattern: "/pages/{id}/permanent", Handler: s.permanentlyDeletePage},
		{Method: http.MethodGet, Pattern: "/activity-logs", Handler: s.listActivityLogs},
		{Method: http.MethodDelete, Pattern: "/activity-logs/retention", Handler: s.deleteOldActivityLogs},
		{Method: http.MethodGet, Pattern: "/backup/export", Handler: s.exportBackup},
		{Method: http.MethodPost, Pattern: "/backup/import", Handler: s.importBackup},
		{Method: http.MethodGet, Pattern: "/system", Handler: s.systemStatus},
		{Method: http.MethodGet, Pattern: "/translations", Handler: s.listTranslationCaches},
		{Method: http.MethodPost, Pattern: "/translations/backfill", Handler: s.backfillMissingTranslationCaches},
		{Method: http.MethodDelete, Pattern: "/translations/stale", Handler: s.deleteStaleTranslationCaches},
		{Method: http.MethodDelete, Pattern: "/translations/{id}", Handler: s.deleteTranslationCache},
		{Method: http.MethodGet, Pattern: "/settings", Handler: s.adminSettings},
		{Method: http.MethodPut, Pattern: "/settings", Handler: s.updateSettings},
	}
}

func (s Server) mountAdminOnlyRoutes(r chi.Router) {
	r.Use(s.requireRole("admin"))
	for _, route := range s.adminOnlyRoutes() {
		switch route.Method {
		case http.MethodGet:
			r.Get(route.Pattern, route.Handler)
		case http.MethodPost:
			r.Post(route.Pattern, route.Handler)
		case http.MethodPut:
			r.Put(route.Pattern, route.Handler)
		case http.MethodDelete:
			r.Delete(route.Pattern, route.Handler)
		default:
			r.Method(route.Method, route.Pattern, route.Handler)
		}
	}
}

func (s Server) publicMaintenanceGate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		settings, err := s.store.GetSettings(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取站点设置失败")
			return
		}
		if publicMaintenanceEnabled(settings) {
			writeError(w, http.StatusServiceUnavailable, publicMaintenanceErrorMessage(settings))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func publicMaintenanceEnabled(settings map[string]any) bool {
	maintenance, ok := settings["maintenance"].(map[string]any)
	if !ok {
		return false
	}
	enabled, _ := maintenance["enabled"].(bool)
	return enabled
}

func publicMaintenanceErrorMessage(settings map[string]any) string {
	maintenance, ok := settings["maintenance"].(map[string]any)
	if !ok {
		return "site under maintenance"
	}
	message, _ := maintenance["message"].(string)
	if message = strings.TrimSpace(message); message != "" {
		return message
	}
	return "site under maintenance"
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := w.Header()
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		header.Set("X-Frame-Options", "SAMEORIGIN")
		header.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if shouldPreventResponseCache(r) {
			header.Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
			header.Set("Pragma", "no-cache")
			header.Set("Expires", "0")
		}
		next.ServeHTTP(w, r)
	})
}

func shouldPreventResponseCache(r *http.Request) bool {
	path := r.URL.Path
	if strings.HasPrefix(path, "/api/admin") || strings.HasPrefix(path, "/api/auth") {
		return true
	}
	if strings.HasPrefix(path, "/api/") {
		return r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions
	}
	return false
}

func (s Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && s.originAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s Server) originAllowed(origin string) bool {
	for _, allowed := range s.cfg.CORSOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return false
}

func (s Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("panic: %v", err)
				writeError(w, http.StatusInternalServerError, "服务器开小差了，请稍后再试")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		if token == "" || token == header {
			writeError(w, http.StatusUnauthorized, "请先登录")
			return
		}
		claims, err := s.auth.ParseToken(token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "登录状态已失效")
			return
		}
		user, err := s.store.GetUserByID(r.Context(), claims.UserID)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "账号不存在或已失效")
			return
		}
		currentClaims, err := refreshClaimsWithUser(claims, user)
		if err != nil {
			if errors.Is(err, errTokenVersionStale) {
				writeError(w, http.StatusUnauthorized, "登录状态已失效")
				return
			}
			writeError(w, http.StatusForbidden, "账号已停用")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, currentClaims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func refreshClaimsWithUser(claims *auth.Claims, user models.User) (*auth.Claims, error) {
	if user.Status == "disabled" {
		return nil, errUserDisabled
	}
	if claims.TokenVersion != user.TokenVersion {
		return nil, errTokenVersionStale
	}
	updated := *claims
	updated.UserID = user.ID
	updated.Username = user.Username
	updated.Role = user.Role
	updated.TokenVersion = user.TokenVersion
	return &updated, nil
}

func claimsFromContext(ctx context.Context) *auth.Claims {
	claims, _ := ctx.Value(claimsKey).(*auth.Claims)
	return claims
}

func (s Server) health(w http.ResponseWriter, r *http.Request) {
	database := s.store.DatabaseStatus(r.Context())
	storage := storageStatus(s.cfg.UploadDir)
	status, code := healthStatus(database, storage)
	writeJSON(w, code, map[string]any{
		"status":   status,
		"time":     time.Now().UTC(),
		"database": database,
		"storage":  storage,
	})
}

func healthStatus(database models.SystemDatabaseStatus, storage models.SystemStorageStatus) (string, int) {
	if database.Status != "ok" || storage.Status != "ok" {
		return "error", http.StatusServiceUnavailable
	}
	return "ok", http.StatusOK
}

func (s Server) site(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取站点设置失败")
		return
	}
	writeJSON(w, http.StatusOK, publicSiteSettings(settings))
}

func (s Server) adminSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取站点设置失败")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func publicSiteSettings(settings map[string]any) map[string]any {
	out := map[string]any{}
	for _, key := range []string{"site", "seo", "appearance"} {
		if value, ok := settings[key]; ok {
			out[key] = value
		}
	}
	comment, ok := settings["comment"].(map[string]any)
	if ok {
		publicComment := map[string]any{}
		for _, key := range []string{"enabled", "notice"} {
			if value, ok := comment[key]; ok {
				publicComment[key] = value
			}
		}
		if len(publicComment) > 0 {
			out["comment"] = publicComment
		}
	}
	maintenance, ok := settings["maintenance"].(map[string]any)
	if ok {
		publicMaintenance := map[string]any{}
		for _, key := range []string{"enabled", "message"} {
			if value, ok := maintenance[key]; ok {
				publicMaintenance[key] = value
			}
		}
		if len(publicMaintenance) > 0 {
			out["maintenance"] = publicMaintenance
		}
	}
	out["translation"] = i18n.PublicTranslationSettings(settings)
	return out
}

func (s Server) listPublicPosts(w http.ResponseWriter, r *http.Request) {
	filter := postFilterFromQuery(r, false)
	targetLanguage := publicContentLanguage(r)
	if wantsPaginatedPostsResponse(r) {
		page, err := s.store.ListPostsPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取文章失败")
			return
		}
		page.Items, err = s.localizePublicPosts(r.Context(), page.Items, targetLanguage)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取文章翻译缓存失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	posts, err := s.store.ListPosts(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取文章失败")
		return
	}
	posts, err = s.localizePublicPosts(r.Context(), posts, targetLanguage)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取文章翻译缓存失败")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

func publicContentLanguage(r *http.Request) string {
	return i18n.NormalizeLanguageCode(r.URL.Query().Get("lang"))
}

func (s Server) localizePublicPosts(ctx context.Context, posts []models.Post, targetLanguage string) ([]models.Post, error) {
	target := i18n.NormalizeLanguageCode(targetLanguage)
	out := make([]models.Post, len(posts))
	copy(out, posts)
	for index := range out {
		sourceLanguage := i18n.NormalizeLanguageCode(out[index].SourceLanguage)
		if target == sourceLanguage {
			continue
		}
		sourceHash := i18n.SourceHash(sourceLanguage, out[index].Title, out[index].Excerpt, out[index].Content)
		translation, err := s.store.GetPostTranslation(ctx, out[index].ID, target, sourceHash)
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		if err != nil {
			return nil, err
		}
		applyPostTranslationToListItem(&out[index], translation)
	}
	return out, nil
}

func applyPostTranslationToListItem(post *models.Post, translation models.PostTranslation) {
	if title := strings.TrimSpace(translation.Title); title != "" {
		post.Title = title
	}
	if excerpt := strings.TrimSpace(translation.Excerpt); excerpt != "" {
		post.Excerpt = excerpt
	}
	if content := strings.TrimSpace(translation.Content); content != "" {
		post.Content = content
	}
}

func (s Server) getPublicPost(w http.ResponseWriter, r *http.Request) {
	post, err := s.store.GetPostBySlug(r.Context(), chi.URLParam(r, "slug"), false)
	if err != nil {
		writeStoreError(w, err, "文章不存在")
		return
	}
	writeJSON(w, http.StatusOK, post)
}

type postTranslationResponse struct {
	models.PostTranslation
	FromCache bool `json:"fromCache"`
}

func (s Server) getPublicPostTranslation(w http.ResponseWriter, r *http.Request) {
	rawLanguage := strings.TrimSpace(r.URL.Query().Get("lang"))
	if rawLanguage == "" {
		writeError(w, http.StatusBadRequest, "缺少目标语言")
		return
	}
	targetLanguage := i18n.NormalizeLanguageCode(rawLanguage)
	post, err := s.store.GetPublicPostBySlugWithoutView(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeStoreError(w, err, "文章不存在")
		return
	}
	sourceLanguage := i18n.NormalizeLanguageCode(post.SourceLanguage)
	sourceHash := i18n.SourceHash(sourceLanguage, post.Title, post.Excerpt, post.Content)
	if targetLanguage == sourceLanguage {
		writeJSON(w, http.StatusOK, postTranslationResponse{
			PostTranslation: sourcePostTranslation(post, sourceHash),
			FromCache:       true,
		})
		return
	}
	cached, err := s.store.GetPostTranslation(r.Context(), post.ID, targetLanguage, sourceHash)
	if err == nil {
		writeJSON(w, http.StatusOK, postTranslationResponse{PostTranslation: cached, FromCache: true})
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		status, message := missingTranslationStatus()
		writeError(w, status, message)
		return
	}
	writeError(w, http.StatusInternalServerError, "读取翻译缓存失败")
}

func sourcePostTranslation(post models.Post, sourceHash string) models.PostTranslation {
	segments := i18n.SplitMarkdownSegments(post.Content)
	out := models.PostTranslation{
		PostID:         post.ID,
		LanguageCode:   i18n.NormalizeLanguageCode(post.SourceLanguage),
		SourceLanguage: i18n.NormalizeLanguageCode(post.SourceLanguage),
		SourceHash:     sourceHash,
		Title:          post.Title,
		Excerpt:        post.Excerpt,
		Content:        post.Content,
		Segments:       make([]models.PostTranslationSegment, 0, len(segments)),
	}
	for index, segment := range segments {
		out.Segments = append(out.Segments, models.PostTranslationSegment{
			Index:          index,
			SourceText:     segment,
			TranslatedText: segment,
		})
	}
	return out
}

func missingTranslationStatus() (int, string) {
	return http.StatusNotFound, "translation is not ready yet"
}

func shouldAutoTranslatePost(post models.Post) bool {
	return post.Status == "published"
}

func postMutationLogDetail(post models.Post) map[string]any {
	detail := map[string]any{"title": post.Title, "status": post.Status}
	if plan, ok := planPublishedPostTranslations(post); ok {
		detail["translationMode"] = "publish-time"
		detail["sourceLanguage"] = plan.SourceLanguage
		detail["translationLanguageCount"] = len(plan.CacheLanguages)
		detail["translationLanguages"] = plan.CacheLanguages
		detail["translationTargetCount"] = len(plan.TargetLanguages)
		detail["translationTargets"] = plan.TargetLanguages
	}
	return detail
}

type publishedPostTranslationPlan struct {
	SourceLanguage  string
	SourceHash      string
	CacheLanguages  []string
	TargetLanguages []string
}

func planPublishedPostTranslations(post models.Post) (publishedPostTranslationPlan, bool) {
	if !shouldAutoTranslatePost(post) {
		return publishedPostTranslationPlan{}, false
	}
	sourceLanguage := i18n.NormalizeLanguageCode(post.SourceLanguage)
	return publishedPostTranslationPlan{
		SourceLanguage:  sourceLanguage,
		SourceHash:      i18n.SourceHash(sourceLanguage, post.Title, post.Excerpt, post.Content),
		CacheLanguages:  allTranslationCacheLanguages(),
		TargetLanguages: autoTranslationTargetLanguages(sourceLanguage),
	}, true
}

func allTranslationCacheLanguages() []string {
	languages := make([]string, 0, len(i18n.SupportedLanguages))
	for _, language := range i18n.SupportedLanguages {
		languages = append(languages, i18n.NormalizeLanguageCode(language.Code))
	}
	return languages
}

func autoTranslationTargetLanguages(sourceLanguage string) []string {
	source := i18n.NormalizeLanguageCode(sourceLanguage)
	targets := make([]string, 0, len(i18n.SupportedLanguages)-1)
	for _, language := range i18n.SupportedLanguages {
		code := i18n.NormalizeLanguageCode(language.Code)
		if code != source {
			targets = append(targets, code)
		}
	}
	return targets
}

func translationSettingsReady(cfg i18n.TranslationSettings) bool {
	return cfg.Enabled &&
		strings.TrimSpace(cfg.APIKey) != "" &&
		strings.TrimSpace(cfg.Endpoint) != "" &&
		strings.TrimSpace(cfg.Model) != ""
}

func (s Server) triggerPublishedPostTranslations(ctx context.Context, post models.Post) {
	plan, ok := planPublishedPostTranslations(post)
	if !ok {
		return
	}
	cfg, targets, err := s.preparePublishedPostTranslationJobs(ctx, post, plan)
	if err != nil {
		log.Printf("post auto translation preparation failed post=%s: %v", post.ID, err)
		return
	}
	if len(targets) == 0 || !translationSettingsReady(cfg) {
		return
	}
	s.runPreparedPublishedPostTranslations(post, plan, targets, cfg)
}

func (s Server) runPreparedPublishedPostTranslations(post models.Post, plan publishedPostTranslationPlan, targets []string, cfg i18n.TranslationSettings) {
	go func(post models.Post, plan publishedPostTranslationPlan, targets []string, cfg i18n.TranslationSettings) {
		ctx, cancel := context.WithTimeout(context.Background(), postAutoTranslationTimeout)
		defer cancel()
		if err := s.ensurePostTranslations(ctx, post, plan.SourceHash, plan.SourceLanguage, targets, cfg); err != nil {
			log.Printf("post auto translation failed post=%s: %v", post.ID, err)
		}
	}(post, plan, targets, cfg)
}

func (s Server) preparePublishedPostTranslationJobs(ctx context.Context, post models.Post, plan publishedPostTranslationPlan) (i18n.TranslationSettings, []string, error) {
	if err := s.ensureSourcePostTranslation(ctx, post, plan); err != nil {
		return i18n.TranslationSettings{}, nil, err
	}
	settings, err := s.store.GetSettings(ctx)
	if err != nil {
		return i18n.TranslationSettings{}, nil, err
	}
	cfg := i18n.TranslationSettingsFrom(settings)
	targets, err := s.missingTranslationTargets(ctx, post, plan.SourceHash, plan.SourceLanguage)
	if err != nil {
		return cfg, nil, err
	}
	if len(targets) == 0 {
		return cfg, nil, nil
	}
	status, errorMessage, runnable := publishTimeTranslationJobState(cfg)
	if err := s.recordPostTranslationJobs(ctx, post.ID, targets, plan.SourceLanguage, plan.SourceHash, status, errorMessage); err != nil {
		return cfg, nil, err
	}
	if !runnable {
		return cfg, nil, nil
	}
	return cfg, targets, nil
}

func (s Server) ensureSourcePostTranslation(ctx context.Context, post models.Post, plan publishedPostTranslationPlan) error {
	if _, err := s.store.UpsertPostTranslation(ctx, sourcePostTranslation(post, plan.SourceHash)); err != nil {
		return err
	}
	return s.recordPostTranslationJob(ctx, post.ID, plan.SourceLanguage, plan.SourceLanguage, plan.SourceHash, "succeeded", "")
}

func publishTimeTranslationJobState(cfg i18n.TranslationSettings) (status, errorMessage string, runnable bool) {
	if translationSettingsReady(cfg) {
		return "running", "", true
	}
	return "failed", translationSettingsNotReadyMessage, false
}

func (s Server) ensurePublishedPostTranslations(ctx context.Context, post models.Post) error {
	plan, ok := planPublishedPostTranslations(post)
	if !ok {
		return nil
	}
	if err := s.ensureSourcePostTranslation(ctx, post, plan); err != nil {
		return err
	}
	settings, err := s.store.GetSettings(ctx)
	if err != nil {
		return err
	}
	cfg := i18n.TranslationSettingsFrom(settings)
	if !translationSettingsReady(cfg) {
		return nil
	}
	return s.ensurePostTranslations(
		ctx,
		post,
		plan.SourceHash,
		plan.SourceLanguage,
		plan.TargetLanguages,
		cfg,
	)
}

func (s Server) ensurePostTranslations(ctx context.Context, post models.Post, sourceHash, sourceLanguage string, targetLanguages []string, cfg i18n.TranslationSettings) error {
	return translateTargetsConcurrently(ctx, targetLanguages, func(ctx context.Context, targetLanguage string) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if _, err := s.store.GetPostTranslation(ctx, post.ID, targetLanguage, sourceHash); err == nil {
			return nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err := s.recordPostTranslationJob(ctx, post.ID, targetLanguage, sourceLanguage, sourceHash, "running", ""); err != nil {
			return err
		}
		if _, err := s.createPostTranslation(ctx, post, sourceHash, sourceLanguage, targetLanguage, cfg); err != nil {
			_ = s.recordPostTranslationJob(ctx, post.ID, targetLanguage, sourceLanguage, sourceHash, "failed", err.Error())
			return err
		}
		if err := s.recordPostTranslationJob(ctx, post.ID, targetLanguage, sourceLanguage, sourceHash, "succeeded", ""); err != nil {
			return err
		}
		return nil
	})
}

func (s Server) recordPostTranslationJob(ctx context.Context, postID, targetLanguage, sourceLanguage, sourceHash, status, errorMessage string) error {
	return s.store.UpsertPostTranslationJob(ctx, models.PostTranslationJob{
		PostID:         postID,
		LanguageCode:   targetLanguage,
		SourceLanguage: sourceLanguage,
		SourceHash:     sourceHash,
		Status:         status,
		ErrorMessage:   errorMessage,
	})
}

func (s Server) recordPostTranslationJobs(ctx context.Context, postID string, targetLanguages []string, sourceLanguage, sourceHash, status, errorMessage string) error {
	for _, targetLanguage := range targetLanguages {
		if err := s.recordPostTranslationJob(ctx, postID, targetLanguage, sourceLanguage, sourceHash, status, errorMessage); err != nil {
			return err
		}
	}
	return nil
}

func (s Server) createPostTranslation(ctx context.Context, post models.Post, sourceHash, sourceLanguage, targetLanguage string, cfg i18n.TranslationSettings) (models.PostTranslation, error) {
	translator := i18n.Translator{}
	title, err := translateOptional(ctx, translator, cfg, sourceLanguage, targetLanguage, post.Title)
	if err != nil {
		return models.PostTranslation{}, err
	}
	excerpt, err := translateOptional(ctx, translator, cfg, sourceLanguage, targetLanguage, post.Excerpt)
	if err != nil {
		return models.PostTranslation{}, err
	}
	sourceSegments := i18n.SplitMarkdownSegments(post.Content)
	segments, content, err := translateMarkdownSegmentsConcurrently(ctx, sourceSegments, sourceLanguage, targetLanguage, func(ctx context.Context, sourceLanguage, targetLanguage, text string) (string, error) {
		return translateOptional(ctx, translator, cfg, sourceLanguage, targetLanguage, text)
	})
	if err != nil {
		return models.PostTranslation{}, err
	}
	return s.store.UpsertPostTranslation(ctx, models.PostTranslation{
		PostID:         post.ID,
		LanguageCode:   targetLanguage,
		SourceLanguage: sourceLanguage,
		SourceHash:     sourceHash,
		Title:          title,
		Excerpt:        excerpt,
		Content:        content,
		Segments:       segments,
	})
}

type translateSegmentFunc func(ctx context.Context, sourceLanguage, targetLanguage, text string) (string, error)
type translateTargetFunc func(ctx context.Context, targetLanguage string) error

func translateTargetsConcurrently(ctx context.Context, targetLanguages []string, translate translateTargetFunc) error {
	if len(targetLanguages) == 0 {
		return nil
	}
	limit := translationTargetConcurrency
	if len(targetLanguages) < limit {
		limit = len(targetLanguages)
	}
	semaphore := make(chan struct{}, limit)
	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstErr error

	recordErr := func(err error) {
		if err == nil {
			return
		}
		mu.Lock()
		defer mu.Unlock()
		if firstErr == nil {
			firstErr = err
		}
	}

	for _, targetLanguage := range targetLanguages {
		targetLanguage := targetLanguage
		if err := ctx.Err(); err != nil {
			return err
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				recordErr(ctx.Err())
				return
			}
			recordErr(translate(ctx, targetLanguage))
		}()
	}
	wg.Wait()
	if firstErr != nil {
		return firstErr
	}
	return ctx.Err()
}

func translateMarkdownSegmentsConcurrently(ctx context.Context, sourceSegments []string, sourceLanguage, targetLanguage string, translate translateSegmentFunc) ([]models.PostTranslationSegment, string, error) {
	if len(sourceSegments) == 0 {
		return []models.PostTranslationSegment{}, "", nil
	}
	limit := translationSegmentConcurrency
	if len(sourceSegments) < limit {
		limit = len(sourceSegments)
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	semaphore := make(chan struct{}, limit)
	errCh := make(chan error, 1)
	done := make(chan struct{})
	segments := make([]models.PostTranslationSegment, len(sourceSegments))
	contentParts := make([]string, len(sourceSegments))
	var wg sync.WaitGroup

	for index, segment := range sourceSegments {
		index, segment := index, segment
		segments[index] = models.PostTranslationSegment{Index: index, SourceText: segment}
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				return
			}

			translated, err := translate(ctx, sourceLanguage, targetLanguage, segment)
			if err != nil {
				select {
				case errCh <- err:
					cancel()
				default:
				}
				return
			}
			segments[index].TranslatedText = translated
			contentParts[index] = translated
		}()
	}

	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case err := <-errCh:
		cancel()
		<-done
		return nil, "", err
	case <-done:
		select {
		case err := <-errCh:
			return nil, "", err
		default:
			return segments, strings.Join(contentParts, "\n\n"), nil
		}
	case <-ctx.Done():
		<-done
		select {
		case err := <-errCh:
			return nil, "", err
		default:
			return nil, "", ctx.Err()
		}
	}
}

func translateOptional(ctx context.Context, translator i18n.Translator, cfg i18n.TranslationSettings, sourceLanguage, targetLanguage, text string) (string, error) {
	if strings.TrimSpace(text) == "" {
		return "", nil
	}
	return translator.TranslateSegment(ctx, cfg, sourceLanguage, targetLanguage, text)
}

func (s Server) listArchives(w http.ResponseWriter, r *http.Request) {
	archives, err := s.store.ListPostArchives(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取文章归档失败")
		return
	}
	archives, err = s.localizePublicArchives(r.Context(), archives, publicContentLanguage(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取文章归档翻译缓存失败")
		return
	}
	writeJSON(w, http.StatusOK, archives)
}

func (s Server) localizePublicArchives(ctx context.Context, archives []models.ArchiveYear, targetLanguage string) ([]models.ArchiveYear, error) {
	target := i18n.NormalizeLanguageCode(targetLanguage)
	out := make([]models.ArchiveYear, len(archives))
	copy(out, archives)
	for yearIndex := range out {
		out[yearIndex].Months = append([]models.ArchiveMonth(nil), out[yearIndex].Months...)
		for monthIndex := range out[yearIndex].Months {
			out[yearIndex].Months[monthIndex].Posts = append([]models.ArchivePost(nil), out[yearIndex].Months[monthIndex].Posts...)
			for postIndex := range out[yearIndex].Months[monthIndex].Posts {
				post := &out[yearIndex].Months[monthIndex].Posts[postIndex]
				sourceLanguage := i18n.NormalizeLanguageCode(post.SourceLanguage)
				if target == sourceLanguage || post.SourceHash == "" {
					continue
				}
				translation, err := s.store.GetPostTranslation(ctx, post.ID, target, post.SourceHash)
				if errors.Is(err, pgx.ErrNoRows) {
					continue
				}
				if err != nil {
					return nil, err
				}
				applyPostTranslationToArchiveItem(post, translation)
			}
		}
	}
	return out, nil
}

func applyPostTranslationToArchiveItem(post *models.ArchivePost, translation models.PostTranslation) {
	if title := strings.TrimSpace(translation.Title); title != "" {
		post.Title = title
	}
	if excerpt := strings.TrimSpace(translation.Excerpt); excerpt != "" {
		post.Excerpt = excerpt
	}
}

func (s Server) createComment(w http.ResponseWriter, r *http.Request) {
	var input models.CommentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.AuthorName) == "" || strings.TrimSpace(input.Content) == "" {
		writeError(w, http.StatusBadRequest, "昵称和评论内容不能为空")
		return
	}
	policy := s.commentPolicy(r)
	if !policy.Enabled {
		writeError(w, http.StatusForbidden, "站点已关闭评论")
		return
	}
	ip := clientIP(r)
	recentComments, err := s.store.CountRecentCommentsByIP(r.Context(), ip, time.Now().Add(-policy.RateLimitWindow))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "评论提交失败")
		return
	}
	if recentComments >= policy.RateLimitMax {
		writeError(w, http.StatusTooManyRequests, "评论提交太频繁，请稍后再试")
		return
	}
	status := moderation.DetermineCommentStatus(input.Content, policy.Moderation, policy.SpamKeywords)
	comment, err := s.store.CreateComment(r.Context(), chi.URLParam(r, "id"), input, status, ip, r.UserAgent())
	if err != nil {
		writeStoreError(w, err, "评论提交失败")
		return
	}
	writeJSON(w, http.StatusCreated, publicCommentResponse(comment))
}

func (s Server) listPublicComments(w http.ResponseWriter, r *http.Request) {
	comments, err := s.store.ListApprovedCommentsForPost(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeStoreError(w, err, "读取评论失败")
		return
	}
	writeJSON(w, http.StatusOK, publicCommentsResponse(comments))
}

func publicCommentResponse(comment models.Comment) models.Comment {
	comment.Email = ""
	comment.IPAddress = ""
	comment.UserAgent = ""
	comment.AuthorUserID = ""
	return comment
}

func publicCommentsResponse(comments []models.Comment) []models.Comment {
	out := make([]models.Comment, 0, len(comments))
	for _, comment := range comments {
		out = append(out, publicCommentResponse(comment))
	}
	return out
}

func (s Server) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	username := strings.TrimSpace(input.Username)
	ip := clientIP(r)
	if s.loginLimiter != nil && s.loginLimiter.blocked(username, ip) {
		s.logLoginAudit(r, username, "rate_limited")
		writeError(w, http.StatusTooManyRequests, "登录尝试过于频繁，请稍后再试")
		return
	}
	user, err := s.store.GetUserByUsername(r.Context(), username)
	if err != nil || !auth.CheckPassword(user.PasswordHash, input.Password) {
		s.logLoginAudit(r, username, "invalid_credentials")
		if s.loginLimiter != nil {
			s.loginLimiter.recordFailure(username, ip)
		}
		writeError(w, http.StatusUnauthorized, "用户名或密码不正确")
		return
	}
	if user.Status == "disabled" {
		s.logLoginAudit(r, user.Username, "disabled")
		writeError(w, http.StatusForbidden, "账号已停用")
		return
	}
	if s.loginLimiter != nil {
		s.loginLimiter.reset(user.Username, ip)
	}
	token, expiresAt, err := s.auth.GenerateToken(user.ID, user.Username, user.Role, user.TokenVersion)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "登录失败")
		return
	}
	_ = s.store.SetLastLogin(r.Context(), user.ID)
	_ = s.store.CreateActivityLog(r.Context(), models.ActivityLogInput{
		ActorID:       user.ID,
		ActorUsername: user.Username,
		Action:        "login",
		EntityType:    "user",
		EntityID:      user.ID,
		Detail:        map[string]any{"username": user.Username},
		IPAddress:     clientIP(r),
		UserAgent:     r.UserAgent(),
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"token":     token,
		"expiresAt": expiresAt,
		"user":      user,
	})
}

func (s Server) logLoginAudit(r *http.Request, username, reason string) {
	_ = s.store.CreateActivityLog(r.Context(), loginAuditInput(username, reason, clientIP(r), r.UserAgent()))
}

func loginAuditInput(username, reason, ip, userAgent string) models.ActivityLogInput {
	auditedUsername := auditUsername(username)
	action := "login_failed"
	if reason == "disabled" || reason == "rate_limited" {
		action = "login_blocked"
	}
	return models.ActivityLogInput{
		ActorUsername: auditedUsername,
		Action:        action,
		EntityType:    "auth",
		EntityID:      auditedUsername,
		Detail:        map[string]any{"reason": reason},
		IPAddress:     strings.TrimSpace(ip),
		UserAgent:     strings.TrimSpace(userAgent),
	}
}

func auditUsername(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "(空用户名)"
	}
	runes := []rune(trimmed)
	if len(runes) > maxAuditUsernameRunes {
		return string(runes[:maxAuditUsernameRunes])
	}
	return trimmed
}

func (s Server) me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "请先登录")
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "账号不存在")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s Server) dashboard(w http.ResponseWriter, r *http.Request) {
	stats, err := s.store.Dashboard(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取仪表盘失败")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (s Server) listAdminPosts(w http.ResponseWriter, r *http.Request) {
	filter := postFilterFromQuery(r, true)
	if wantsPaginatedPostsResponse(r) {
		page, err := s.store.ListPostsPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取文章失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	posts, err := s.store.ListPosts(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取文章失败")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

func (s Server) getAdminPost(w http.ResponseWriter, r *http.Request) {
	post, err := s.store.GetPostByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeStoreError(w, err, "文章不存在")
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (s Server) createPost(w http.ResponseWriter, r *http.Request) {
	var input models.PostInput
	if !decodeJSON(w, r, &input) || !validatePostInput(w, input) {
		return
	}
	claims := claimsFromContext(r.Context())
	post, err := s.store.CreatePost(r.Context(), input, claims.UserID)
	if err != nil {
		writeStoreError(w, err, "创建文章失败")
		return
	}
	s.logAdminAction(r, "create", "post", post.ID, postMutationLogDetail(post))
	s.triggerPublishedPostTranslations(r.Context(), post)
	writeJSON(w, http.StatusCreated, post)
}

func (s Server) updatePost(w http.ResponseWriter, r *http.Request) {
	var input models.PostInput
	if !decodeJSON(w, r, &input) || !validatePostInput(w, input) {
		return
	}
	claims := claimsFromContext(r.Context())
	actorID := ""
	if claims != nil {
		actorID = claims.UserID
	}
	post, err := s.store.UpdatePost(r.Context(), chi.URLParam(r, "id"), input, actorID)
	if err != nil {
		writeStoreError(w, err, "更新文章失败")
		return
	}
	s.logAdminAction(r, "update", "post", post.ID, postMutationLogDetail(post))
	s.triggerPublishedPostTranslations(r.Context(), post)
	writeJSON(w, http.StatusOK, post)
}

func (s Server) deletePost(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeletePost(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeStoreError(w, err, "删除文章失败")
		return
	}
	s.logAdminAction(r, "trash", "post", chi.URLParam(r, "id"), nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) restorePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.RestorePost(r.Context(), id); err != nil {
		writeStoreError(w, err, "恢复文章失败")
		return
	}
	post, err := s.store.GetPostByID(r.Context(), id)
	if err != nil {
		writeStoreError(w, err, "读取恢复后的文章失败")
		return
	}
	s.logAdminAction(r, "restore", "post", id, restoredPostLogDetail(post))
	s.triggerPublishedPostTranslations(r.Context(), post)
	w.WriteHeader(http.StatusNoContent)
}

func restoredPostLogDetail(post models.Post) map[string]any {
	detail := postMutationLogDetail(post)
	detail["restoreMode"] = "trash"
	return detail
}

func (s Server) permanentlyDeletePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.PermanentlyDeletePost(r.Context(), id); err != nil {
		writeStoreError(w, err, "彻底删除文章失败")
		return
	}
	s.logAdminAction(r, "delete_permanent", "post", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) listCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := s.store.ListCategories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取分类失败")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

func (s Server) createCategory(w http.ResponseWriter, r *http.Request) {
	var input models.Category
	if !decodeJSON(w, r, &input) || !validateName(w, input.Name, "分类名称不能为空") {
		return
	}
	category, err := s.store.CreateCategory(r.Context(), input)
	if err != nil {
		writeStoreError(w, err, "创建分类失败")
		return
	}
	s.logAdminAction(r, "create", "category", category.ID, map[string]any{"name": category.Name})
	writeJSON(w, http.StatusCreated, category)
}

func (s Server) updateCategory(w http.ResponseWriter, r *http.Request) {
	var input models.Category
	if !decodeJSON(w, r, &input) || !validateName(w, input.Name, "分类名称不能为空") {
		return
	}
	category, err := s.store.UpdateCategory(r.Context(), chi.URLParam(r, "id"), input)
	if err != nil {
		writeStoreError(w, err, "更新分类失败")
		return
	}
	s.logAdminAction(r, "update", "category", category.ID, map[string]any{"name": category.Name})
	writeJSON(w, http.StatusOK, category)
}

func (s Server) deleteCategory(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteCategory(r.Context(), chi.URLParam(r, "id")); err != nil {
		var inUse store.TaxonomyInUseError
		if errors.As(err, &inUse) {
			writeTaxonomyInUseError(w, "分类", inUse.Count)
			return
		}
		writeStoreError(w, err, "删除分类失败")
		return
	}
	s.logAdminAction(r, "delete", "category", chi.URLParam(r, "id"), nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) listTags(w http.ResponseWriter, r *http.Request) {
	tags, err := s.store.ListTags(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取标签失败")
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

func (s Server) createTag(w http.ResponseWriter, r *http.Request) {
	var input models.Tag
	if !decodeJSON(w, r, &input) || !validateName(w, input.Name, "标签名称不能为空") {
		return
	}
	tag, err := s.store.CreateTag(r.Context(), input)
	if err != nil {
		writeStoreError(w, err, "创建标签失败")
		return
	}
	s.logAdminAction(r, "create", "tag", tag.ID, map[string]any{"name": tag.Name})
	writeJSON(w, http.StatusCreated, tag)
}

func (s Server) updateTag(w http.ResponseWriter, r *http.Request) {
	var input models.Tag
	if !decodeJSON(w, r, &input) || !validateName(w, input.Name, "标签名称不能为空") {
		return
	}
	tag, err := s.store.UpdateTag(r.Context(), chi.URLParam(r, "id"), input)
	if err != nil {
		writeStoreError(w, err, "更新标签失败")
		return
	}
	s.logAdminAction(r, "update", "tag", tag.ID, map[string]any{"name": tag.Name})
	writeJSON(w, http.StatusOK, tag)
}

func (s Server) deleteTag(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteTag(r.Context(), chi.URLParam(r, "id")); err != nil {
		var inUse store.TaxonomyInUseError
		if errors.As(err, &inUse) {
			writeTaxonomyInUseError(w, "标签", inUse.Count)
			return
		}
		writeStoreError(w, err, "删除标签失败")
		return
	}
	s.logAdminAction(r, "delete", "tag", chi.URLParam(r, "id"), nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) listComments(w http.ResponseWriter, r *http.Request) {
	filter := commentFilterFromQuery(r)
	if wantsPaginatedCommentsResponse(r) {
		page, err := s.store.ListCommentsPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取评论失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	comments, err := s.store.ListComments(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取评论失败")
		return
	}
	writeJSON(w, http.StatusOK, comments)
}

func commentFilterFromQuery(r *http.Request) models.CommentFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 20)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	return models.CommentFilter{
		Query:  strings.TrimSpace(query.Get("q")),
		Status: strings.TrimSpace(query.Get("status")),
		Limit:  limit,
		Offset: offset,
	}
}

func wantsPaginatedCommentsResponse(r *http.Request) bool {
	query := r.URL.Query()
	return parseBool(query.Get("paged")) || strings.TrimSpace(query.Get("page")) != ""
}

func (s Server) moderateComment(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	comment, err := s.store.ModerateComment(r.Context(), chi.URLParam(r, "id"), input.Status)
	if err != nil {
		writeStoreError(w, err, "更新评论状态失败")
		return
	}
	s.logAdminAction(r, "moderate", "comment", comment.ID, map[string]any{"status": comment.Status, "postId": comment.PostID})
	writeJSON(w, http.StatusOK, comment)
}

func (s Server) replyComment(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Content string `json:"content"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	content := strings.TrimSpace(input.Content)
	if content == "" {
		writeError(w, http.StatusBadRequest, "回复内容不能为空")
		return
	}
	claims := claimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "请先登录")
		return
	}
	authorName := claims.Username
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err == nil && strings.TrimSpace(user.DisplayName) != "" {
		authorName = strings.TrimSpace(user.DisplayName)
	}
	comment, err := s.store.CreateAdminCommentReply(r.Context(), chi.URLParam(r, "id"), claims.UserID, authorName, content)
	if err != nil {
		writeStoreError(w, err, "回复评论失败")
		return
	}
	s.logAdminAction(r, "reply", "comment", comment.ID, map[string]any{
		"postId":   comment.PostID,
		"parentId": comment.ParentID,
	})
	writeJSON(w, http.StatusCreated, comment)
}

func (s Server) deleteComment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.DeleteComment(r.Context(), id); err != nil {
		writeStoreError(w, err, "删除评论失败")
		return
	}
	s.logAdminAction(r, "delete", "comment", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) updateSettings(w http.ResponseWriter, r *http.Request) {
	var input map[string]any
	if !decodeJSON(w, r, &input) {
		return
	}
	if err := validateSettingsUpdate(input); err != nil {
		writeError(w, http.StatusBadRequest, "站点设置格式不正确")
		return
	}
	settings, err := s.store.UpdateSettings(r.Context(), input)
	if err != nil {
		writeStoreError(w, err, "更新站点设置失败")
		return
	}
	s.logAdminAction(r, "update", "settings", "site", settingsUpdateLogDetail(input))
	s.triggerSettingsTranslationBackfill(input, settings)
	writeJSON(w, http.StatusOK, settings)
}

var errInvalidSettings = errors.New("invalid settings")

func settingsTranslationBackfillConfig(input, settings map[string]any) (i18n.TranslationSettings, bool) {
	if _, ok := settingSection(input, "translation"); !ok {
		return i18n.TranslationSettings{}, false
	}
	cfg := i18n.TranslationSettingsFrom(settings)
	return cfg, translationSettingsReady(cfg)
}

func (s Server) triggerSettingsTranslationBackfill(input, settings map[string]any) {
	cfg, ok := settingsTranslationBackfillConfig(input, settings)
	if !ok {
		return
	}
	go func(cfg i18n.TranslationSettings) {
		ctx, cancel := context.WithTimeout(context.Background(), postAutoTranslationTimeout)
		defer cancel()
		if _, err := s.queueMissingPublishedPostTranslations(ctx, cfg, "settings"); err != nil {
			log.Printf("translation settings backfill failed: %v", err)
		}
	}(cfg)
}

func settingsUpdateLogDetail(input map[string]any) map[string]any {
	sections := settingSectionNames(input)
	detail := map[string]any{
		"sectionCount": len(sections),
		"sections":     sections,
	}
	if site, ok := settingSection(input, "site"); ok {
		detail["icpConfigured"] = nonEmptySetting(site, "icp")
		detail["icpURLConfigured"] = nonEmptySetting(site, "icpUrl")
		detail["policeRecordConfigured"] = nonEmptySetting(site, "policeRecord")
		detail["policeRecordURLConfigured"] = nonEmptySetting(site, "policeRecordUrl")
		detail["publicContactConfigured"] = nonEmptySetting(site, "email") || nonEmptySetting(site, "wechat")
	}
	if seo, ok := settingSection(input, "seo"); ok {
		detail["seoDescriptionConfigured"] = nonEmptySetting(seo, "description")
		detail["seoKeywordsConfigured"] = nonEmptySetting(seo, "keywords")
		detail["seoVerificationCount"] = configuredSettingCount(seo, []string{
			"baiduSiteVerification",
			"googleSiteVerification",
			"bingSiteVerification",
			"so360SiteVerification",
			"sogouSiteVerification",
		})
	}
	if appearance, ok := settingSection(input, "appearance"); ok {
		if themeMode := stringSetting(appearance, "themeMode", ""); themeMode != "" {
			detail["themeMode"] = themeMode
		}
		if homeLayout := stringSetting(appearance, "homeLayout", ""); homeLayout != "" {
			detail["homeLayout"] = homeLayout
		}
		if coverStyle := stringSetting(appearance, "coverStyle", ""); coverStyle != "" {
			detail["coverStyle"] = coverStyle
		}
		detail["accentColorConfigured"] = nonEmptySetting(appearance, "accentColor")
	}
	if comment, ok := settingSection(input, "comment"); ok {
		if value, ok := boolSetting(comment, "enabled"); ok {
			detail["commentsEnabled"] = value
		}
		if value, ok := boolSetting(comment, "moderation"); ok {
			detail["commentModeration"] = value
		}
		detail["commentSpamKeywordCount"] = settingListLength(comment, "spamKeywords")
		if value, ok := intSetting(comment["rateLimitWindowMinutes"]); ok {
			detail["commentRateLimitWindowMinutes"] = value
		}
		if value, ok := intSetting(comment["rateLimitMax"]); ok {
			detail["commentRateLimitMax"] = value
		}
	}
	if translation, ok := settingSection(input, "translation"); ok {
		if value, ok := boolSetting(translation, "enabled"); ok {
			detail["translationEnabled"] = value
		}
		if provider := stringSetting(translation, "provider", ""); provider != "" {
			detail["translationProvider"] = provider
		}
		if model := stringSetting(translation, "model", ""); model != "" {
			detail["translationModel"] = model
		}
		detail["translationAPIKeyConfigured"] = nonEmptySetting(translation, "apiKey")
		if value, ok := intSetting(translation["timeoutSeconds"]); ok {
			detail["translationTimeoutSeconds"] = value
		}
	}
	if maintenance, ok := settingSection(input, "maintenance"); ok {
		if value, ok := boolSetting(maintenance, "enabled"); ok {
			detail["maintenanceEnabled"] = value
		}
		detail["maintenanceMessageConfigured"] = nonEmptySetting(maintenance, "message")
	}
	return detail
}

func settingSectionNames(input map[string]any) []string {
	sections := make([]string, 0, len(input))
	for key := range input {
		key = strings.TrimSpace(key)
		if key != "" {
			sections = append(sections, key)
		}
	}
	sort.Strings(sections)
	return sections
}

func settingSection(input map[string]any, key string) (map[string]any, bool) {
	section, ok := input[key].(map[string]any)
	return section, ok
}

func nonEmptySetting(section map[string]any, key string) bool {
	return stringSetting(section, key, "") != ""
}

func boolSetting(section map[string]any, key string) (bool, bool) {
	value, ok := section[key].(bool)
	return value, ok
}

func settingListLength(section map[string]any, key string) int {
	switch value := section[key].(type) {
	case []string:
		return len(value)
	case []any:
		return len(value)
	default:
		return 0
	}
}

func configuredSettingCount(section map[string]any, keys []string) int {
	count := 0
	for _, key := range keys {
		if nonEmptySetting(section, key) {
			count++
		}
	}
	return count
}

func validateSettingsUpdate(input map[string]any) error {
	if !validSiteComplianceURLs(input) {
		return errInvalidSettings
	}
	cfg := i18n.TranslationSettingsFrom(input)
	if !cfg.Enabled {
		return nil
	}
	if strings.TrimSpace(cfg.APIKey) == "" || strings.TrimSpace(cfg.Model) == "" {
		return errInvalidSettings
	}
	parsed, err := url.Parse(strings.TrimSpace(cfg.Endpoint))
	if err != nil || parsed.Host == "" {
		return errInvalidSettings
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return nil
	default:
		return errInvalidSettings
	}
}

func validSiteComplianceURLs(input map[string]any) bool {
	site, ok := input["site"].(map[string]any)
	if !ok {
		return true
	}
	for _, key := range []string{"icpUrl", "policeRecordUrl"} {
		if !validOptionalHTTPURL(site[key]) {
			return false
		}
	}
	return true
}

func validOptionalHTTPURL(value any) bool {
	raw, ok := value.(string)
	if !ok {
		return value == nil
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return true
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return false
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return true
	default:
		return false
	}
}

func postFilterFromQuery(r *http.Request, admin bool) models.PostFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 20)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	return models.PostFilter{
		Query:     strings.TrimSpace(query.Get("q")),
		Status:    strings.TrimSpace(query.Get("status")),
		Category:  strings.TrimSpace(query.Get("category")),
		Tag:       strings.TrimSpace(query.Get("tag")),
		Featured:  parseOptionalBool(query.Get("featured")),
		Limit:     limit,
		Offset:    offset,
		Admin:     admin,
		Deleted:   parseBool(query.Get("deleted")),
		Scheduled: parseBool(query.Get("scheduled")),
	}
}

func wantsPaginatedPostsResponse(r *http.Request) bool {
	query := r.URL.Query()
	return parseBool(query.Get("paged")) || strings.TrimSpace(query.Get("page")) != ""
}

func parseInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseBool(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func parseOptionalBool(value string) *bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		parsed := true
		return &parsed
	case "0", "false", "no", "off":
		parsed := false
		return &parsed
	default:
		return nil
	}
}

func validatePostInput(w http.ResponseWriter, input models.PostInput) bool {
	if strings.TrimSpace(input.Title) == "" {
		writeError(w, http.StatusBadRequest, "文章标题不能为空")
		return false
	}
	return true
}

func validateName(w http.ResponseWriter, value, message string) bool {
	if strings.TrimSpace(value) == "" {
		writeError(w, http.StatusBadRequest, message)
		return false
	}
	return true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dest any) bool {
	return decodeJSONWithLimit(w, r, dest, maxJSONBodyBytes, "请求数据格式不正确")
}

func decodeJSONWithLimit(w http.ResponseWriter, r *http.Request, dest any, maxBytes int64, message string) bool {
	defer r.Body.Close()
	if !requestContentTypeIsJSON(r) {
		writeError(w, http.StatusUnsupportedMediaType, "请求 Content-Type 必须是 application/json")
		return false
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dest); err != nil {
		writeError(w, http.StatusBadRequest, message)
		return false
	}
	var extra json.RawMessage
	if err := decoder.Decode(&extra); err != io.EOF {
		writeError(w, http.StatusBadRequest, message)
		return false
	}
	return true
}

func requestContentTypeIsJSON(r *http.Request) bool {
	contentType := strings.TrimSpace(r.Header.Get("Content-Type"))
	if contentType == "" {
		return false
	}
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	return strings.EqualFold(mediaType, "application/json")
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": message})
}

func writeStoreError(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, fallback)
		return
	}
	writeError(w, http.StatusBadRequest, fallback)
}

func writeTaxonomyInUseError(w http.ResponseWriter, label string, count int) {
	writeError(w, http.StatusConflict, label+"仍被 "+strconv.Itoa(count)+" 篇内容引用，请先从文章中移除")
}

func clientIP(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value != "" {
			return strings.TrimSpace(strings.Split(value, ",")[0])
		}
	}
	return r.RemoteAddr
}

func (s Server) commentPolicy(r *http.Request) commentPolicy {
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		return defaultCommentPolicy()
	}
	return commentPolicyFromSettings(settings)
}

func defaultCommentPolicy() commentPolicy {
	return commentPolicy{
		Enabled:         true,
		Moderation:      true,
		SpamKeywords:    []string{},
		RateLimitWindow: time.Duration(defaultCommentRateLimitMinutes) * time.Minute,
		RateLimitMax:    defaultCommentRateLimitMax,
	}
}

func commentPolicyFromSettings(settings map[string]any) commentPolicy {
	policy := defaultCommentPolicy()
	commentSettings, ok := settings["comment"].(map[string]any)
	if !ok {
		return policy
	}
	if value, ok := commentSettings["moderation"].(bool); ok {
		policy.Moderation = value
	}
	if value, ok := commentSettings["enabled"].(bool); ok {
		policy.Enabled = value
	}
	policy.SpamKeywords = stringSliceSetting(commentSettings["spamKeywords"])
	policy.RateLimitWindow = time.Duration(boundedIntSetting(
		commentSettings["rateLimitWindowMinutes"],
		defaultCommentRateLimitMinutes,
		1,
		maxCommentRateLimitMinutes,
	)) * time.Minute
	policy.RateLimitMax = boundedIntSetting(
		commentSettings["rateLimitMax"],
		defaultCommentRateLimitMax,
		1,
		maxCommentRateLimitMax,
	)
	return policy
}

func stringSliceSetting(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return []string{}
	}
	out := []string{}
	for _, item := range items {
		text, ok := item.(string)
		if !ok {
			continue
		}
		text = strings.TrimSpace(text)
		if text != "" {
			out = append(out, text)
		}
	}
	return out
}

func boundedIntSetting(value any, fallback, minValue, maxValue int) int {
	parsed, ok := intSetting(value)
	if !ok || parsed < minValue {
		return fallback
	}
	if parsed > maxValue {
		return maxValue
	}
	return parsed
}

func intSetting(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case float64:
		return int(typed), true
	case json.Number:
		parsed, err := typed.Int64()
		return int(parsed), err == nil
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(typed))
		return parsed, err == nil
	default:
		return 0, false
	}
}
