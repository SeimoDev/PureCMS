package api

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

const translationBackfillPostPageLimit = 50

type deleteTranslationCachesResponse struct {
	Deleted int64 `json:"deleted"`
}

type backfillTranslationCachesResponse struct {
	ScannedPosts  int `json:"scannedPosts"`
	QueuedPosts   int `json:"queuedPosts"`
	QueuedTargets int `json:"queuedTargets"`
}

type translationBackfillJob struct {
	Post            models.Post
	SourceHash      string
	SourceLanguage  string
	TargetLanguages []string
}

func translationCacheFilterFromQuery(r *http.Request) models.TranslationCacheFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 20)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	filter := models.TranslationCacheFilter{
		Query:  strings.TrimSpace(query.Get("q")),
		Limit:  limit,
		Offset: offset,
	}
	if strings.TrimSpace(query.Get("lang")) != "" {
		filter.LanguageCode = i18n.NormalizeLanguageCode(query.Get("lang"))
	}
	if strings.TrimSpace(query.Get("source")) != "" {
		filter.SourceLanguage = i18n.NormalizeLanguageCode(query.Get("source"))
	}
	return filter
}

func (s Server) listTranslationCaches(w http.ResponseWriter, r *http.Request) {
	page, err := s.store.ListTranslationCachesPage(r.Context(), translationCacheFilterFromQuery(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取翻译缓存失败")
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s Server) backfillMissingTranslationCaches(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取翻译配置失败")
		return
	}
	cfg := i18n.TranslationSettingsFrom(settings)
	if !translationSettingsReady(cfg) {
		writeError(w, http.StatusBadRequest, "AI 翻译配置未启用或不完整")
		return
	}

	result, err := s.queueMissingPublishedPostTranslations(r.Context(), cfg, "manual")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "扫描缺失翻译失败")
		return
	}
	s.logAdminAction(r, "backfill", "translation_cache", "missing", map[string]any{
		"scannedPosts":  result.ScannedPosts,
		"queuedPosts":   result.QueuedPosts,
		"queuedTargets": result.QueuedTargets,
	})
	writeJSON(w, http.StatusAccepted, result)
}

func (s Server) deleteTranslationCache(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	deleted, err := s.store.DeleteTranslationCache(r.Context(), id)
	if err != nil {
		writeStoreError(w, err, "删除翻译缓存失败")
		return
	}
	if deleted == 0 {
		writeError(w, http.StatusNotFound, "翻译缓存不存在")
		return
	}
	s.logAdminAction(r, "delete", "translation_cache", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) deleteStaleTranslationCaches(w http.ResponseWriter, r *http.Request) {
	deleted, err := s.store.DeleteStaleTranslationCaches(r.Context())
	if err != nil {
		writeStoreError(w, err, "清理过期翻译缓存失败")
		return
	}
	s.logAdminAction(r, "delete_stale", "translation_cache", "stale", map[string]any{"deleted": deleted})
	writeJSON(w, http.StatusOK, deleteTranslationCachesResponse{Deleted: deleted})
}

func (s Server) planMissingPublishedPostTranslations(ctx context.Context) (backfillTranslationCachesResponse, []translationBackfillJob, error) {
	var result backfillTranslationCachesResponse
	jobs := []translationBackfillJob{}
	offset := 0

	for {
		page, err := s.store.ListPostsPage(ctx, translationBackfillPostFilter(offset))
		if err != nil {
			return result, nil, err
		}
		if len(page.Items) == 0 {
			break
		}
		result.ScannedPosts += len(page.Items)
		for _, post := range page.Items {
			if !shouldAutoTranslatePost(post) {
				continue
			}
			sourceLanguage := i18n.NormalizeLanguageCode(post.SourceLanguage)
			sourceHash := i18n.SourceHash(sourceLanguage, post.Title, post.Excerpt, post.Content)
			targets, err := s.missingTranslationTargets(ctx, post, sourceHash, sourceLanguage)
			if err != nil {
				return result, nil, err
			}
			if len(targets) == 0 {
				continue
			}
			job := translationBackfillJob{
				Post:            post,
				SourceHash:      sourceHash,
				SourceLanguage:  sourceLanguage,
				TargetLanguages: targets,
			}
			jobs = append(jobs, job)
			result.addTranslationBackfillJob(job)
		}
		if page.Limit <= 0 || offset+page.Limit >= page.Total {
			break
		}
		offset += page.Limit
	}

	return result, jobs, nil
}

func (s Server) StartPublishedPostTranslationBackfill(ctx context.Context) {
	go func() {
		ctx, cancel := context.WithTimeout(ctx, postAutoTranslationTimeout)
		defer cancel()

		settings, err := s.store.GetSettings(ctx)
		if err != nil {
			log.Printf("startup translation backfill settings load failed: %v", err)
			return
		}
		cfg := i18n.TranslationSettingsFrom(settings)
		if !translationSettingsReady(cfg) {
			return
		}
		if _, err := s.queueMissingPublishedPostTranslations(ctx, cfg, "startup"); err != nil {
			log.Printf("startup translation backfill failed: %v", err)
		}
	}()
}

func (s Server) queueMissingPublishedPostTranslations(ctx context.Context, cfg i18n.TranslationSettings, reason string) (backfillTranslationCachesResponse, error) {
	result, jobs, err := s.planMissingPublishedPostTranslations(ctx)
	if err != nil {
		return result, err
	}
	if result.QueuedTargets == 0 {
		return result, nil
	}
	log.Printf("published post translation backfill queued reason=%s posts=%d targets=%d", reason, result.QueuedPosts, result.QueuedTargets)
	s.runTranslationBackfillJobs(jobs, cfg)
	return result, nil
}

func translationBackfillPostFilter(offset int) models.PostFilter {
	if offset < 0 {
		offset = 0
	}
	return models.PostFilter{
		Admin:  true,
		Status: "published",
		Limit:  translationBackfillPostPageLimit,
		Offset: offset,
	}
}

func (s Server) missingTranslationTargets(ctx context.Context, post models.Post, sourceHash, sourceLanguage string) ([]string, error) {
	targets := autoTranslationTargetLanguages(sourceLanguage)
	missing := make([]string, 0, len(targets))
	for _, target := range targets {
		if _, err := s.store.GetPostTranslation(ctx, post.ID, target, sourceHash); err == nil {
			continue
		} else if errors.Is(err, pgx.ErrNoRows) {
			missing = append(missing, target)
		} else {
			return nil, err
		}
	}
	return missing, nil
}

func (s Server) runTranslationBackfillJobs(jobs []translationBackfillJob, cfg i18n.TranslationSettings) {
	if len(jobs) == 0 {
		return
	}
	go func(jobs []translationBackfillJob) {
		for _, job := range jobs {
			ctx, cancel := context.WithTimeout(context.Background(), postAutoTranslationTimeout)
			err := s.ensurePostTranslations(ctx, job.Post, job.SourceHash, job.SourceLanguage, job.TargetLanguages, cfg)
			cancel()
			if err != nil {
				log.Printf("translation backfill failed post=%s targets=%s: %v", job.Post.ID, strings.Join(job.TargetLanguages, ","), err)
			}
		}
	}(jobs)
}

func (r *backfillTranslationCachesResponse) addTranslationBackfillJob(job translationBackfillJob) {
	r.QueuedPosts++
	r.QueuedTargets += len(job.TargetLanguages)
}
