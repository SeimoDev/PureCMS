package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

const defaultTranslationCachePageLimit = 20
const maxTranslationCachePageLimit = 100

func normalizeTranslationCacheFilter(filter models.TranslationCacheFilter) models.TranslationCacheFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultTranslationCachePageLimit
	}
	if filter.Limit > maxTranslationCachePageLimit {
		filter.Limit = maxTranslationCachePageLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	filter.Query = strings.TrimSpace(filter.Query)
	if strings.TrimSpace(filter.LanguageCode) != "" {
		filter.LanguageCode = i18n.NormalizeLanguageCode(filter.LanguageCode)
	}
	if strings.TrimSpace(filter.SourceLanguage) != "" {
		filter.SourceLanguage = i18n.NormalizeLanguageCode(filter.SourceLanguage)
	}
	return filter
}

func translationCacheListWhere(filter models.TranslationCacheFilter) (string, []any) {
	filter = normalizeTranslationCacheFilter(filter)
	args := []any{}
	conditions := []string{"1=1"}
	if filter.LanguageCode != "" {
		args = append(args, filter.LanguageCode)
		conditions = append(conditions, fmt.Sprintf("tc.language_code=$%d", len(args)))
	}
	if filter.SourceLanguage != "" {
		args = append(args, filter.SourceLanguage)
		conditions = append(conditions, fmt.Sprintf("tc.source_language=$%d", len(args)))
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		placeholder := fmt.Sprintf("$%d", len(args))
		conditions = append(conditions, fmt.Sprintf(`(
			p.title ILIKE %[1]s OR
			p.slug ILIKE %[1]s OR
			COALESCE(pt.title, '') ILIKE %[1]s OR
			tc.source_hash ILIKE %[1]s
		)`, placeholder))
	}
	return strings.Join(conditions, " AND "), args
}

func currentPostSourceHashSQL(alias string) string {
	return fmt.Sprintf(
		"encode(digest(convert_to(coalesce(nullif(%[1]s.source_language, ''), 'zh-CN'), 'UTF8') || decode('00', 'hex') || convert_to(btrim(%[1]s.title), 'UTF8') || decode('00', 'hex') || convert_to(btrim(%[1]s.excerpt), 'UTF8') || decode('00', 'hex') || convert_to(%[1]s.content, 'UTF8'), 'sha256'), 'hex')",
		alias,
	)
}

func (s Store) GetPostTranslation(ctx context.Context, postID, languageCode, sourceHash string) (models.PostTranslation, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, post_id::text, language_code, source_language, source_hash, title, excerpt, content, segments::text, created_at, updated_at
FROM post_translations
WHERE post_id=$1 AND language_code=$2 AND source_hash=$3`,
		postID,
		i18n.NormalizeLanguageCode(languageCode),
		strings.TrimSpace(sourceHash),
	)
	return scanPostTranslation(row)
}

func (s Store) UpsertPostTranslation(ctx context.Context, input models.PostTranslation) (models.PostTranslation, error) {
	input.LanguageCode = i18n.NormalizeLanguageCode(input.LanguageCode)
	input.SourceLanguage = i18n.NormalizeLanguageCode(input.SourceLanguage)
	rawSegments, err := json.Marshal(input.Segments)
	if err != nil {
		return models.PostTranslation{}, err
	}
	var item models.PostTranslation
	var storedSegments string
	err = s.pool.QueryRow(ctx, `
INSERT INTO post_translations (post_id, language_code, source_language, source_hash, title, excerpt, content, segments)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
ON CONFLICT (post_id, language_code, source_hash) DO UPDATE SET
  source_language=excluded.source_language,
  title=excluded.title,
  excerpt=excluded.excerpt,
  content=excluded.content,
  segments=excluded.segments
RETURNING id::text, post_id::text, language_code, source_language, source_hash, title, excerpt, content, segments::text, created_at, updated_at`,
		input.PostID,
		input.LanguageCode,
		input.SourceLanguage,
		strings.TrimSpace(input.SourceHash),
		input.Title,
		input.Excerpt,
		input.Content,
		string(rawSegments),
	).Scan(
		&item.ID,
		&item.PostID,
		&item.LanguageCode,
		&item.SourceLanguage,
		&item.SourceHash,
		&item.Title,
		&item.Excerpt,
		&item.Content,
		&storedSegments,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return item, err
	}
	return parsePostTranslationSegments(item, storedSegments)
}

func normalizePostTranslationJobStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "succeeded", "failed":
		return strings.TrimSpace(status)
	default:
		return "running"
	}
}

func truncateTranslationJobError(value string) string {
	const maxRunes = 1000
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) <= maxRunes {
		return value
	}
	return string(runes[:maxRunes])
}

func (s Store) UpsertPostTranslationJob(ctx context.Context, input models.PostTranslationJob) error {
	status := normalizePostTranslationJobStatus(input.Status)
	errorMessage := ""
	if status == "failed" {
		errorMessage = truncateTranslationJobError(input.ErrorMessage)
	}
	_, err := s.pool.Exec(ctx, `
INSERT INTO post_translation_jobs (post_id, language_code, source_language, source_hash, status, error_message, started_at, finished_at)
VALUES (
  $1,$2,$3,$4,$5,$6,
  now(),
  CASE WHEN $5 IN ('succeeded', 'failed') THEN now() ELSE NULL END
)
ON CONFLICT (post_id, language_code, source_hash) DO UPDATE SET
  source_language=excluded.source_language,
  status=excluded.status,
  error_message=excluded.error_message,
  started_at=CASE
    WHEN excluded.status='running' THEN now()
    ELSE COALESCE(post_translation_jobs.started_at, excluded.started_at, now())
  END,
  finished_at=CASE WHEN excluded.status IN ('succeeded', 'failed') THEN now() ELSE NULL END`,
		input.PostID,
		i18n.NormalizeLanguageCode(input.LanguageCode),
		i18n.NormalizeLanguageCode(input.SourceLanguage),
		strings.TrimSpace(input.SourceHash),
		status,
		errorMessage,
	)
	return err
}

func (s Store) ListAllPostTranslations(ctx context.Context) ([]models.PostTranslation, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, post_id::text, language_code, source_language, source_hash, title, excerpt, content, segments::text, created_at, updated_at
FROM post_translations
ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	translations := []models.PostTranslation{}
	for rows.Next() {
		item, err := scanPostTranslation(rows)
		if err != nil {
			return nil, err
		}
		translations = append(translations, item)
	}
	return translations, rows.Err()
}

func (s Store) ListAllPostTranslationJobs(ctx context.Context) ([]models.PostTranslationJob, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, post_id::text, language_code, source_language, source_hash, status, error_message, started_at, finished_at, created_at, updated_at
FROM post_translation_jobs
ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := []models.PostTranslationJob{}
	for rows.Next() {
		var job models.PostTranslationJob
		var startedAt sql.NullTime
		var finishedAt sql.NullTime
		if err := rows.Scan(
			&job.ID,
			&job.PostID,
			&job.LanguageCode,
			&job.SourceLanguage,
			&job.SourceHash,
			&job.Status,
			&job.ErrorMessage,
			&startedAt,
			&finishedAt,
			&job.CreatedAt,
			&job.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if startedAt.Valid {
			value := startedAt.Time
			job.StartedAt = &value
		}
		if finishedAt.Valid {
			value := finishedAt.Time
			job.FinishedAt = &value
		}
		job.LanguageCode = i18n.NormalizeLanguageCode(job.LanguageCode)
		job.SourceLanguage = i18n.NormalizeLanguageCode(job.SourceLanguage)
		jobs = append(jobs, job)
	}
	return jobs, rows.Err()
}

func (s Store) ListTranslationCaches(ctx context.Context, filter models.TranslationCacheFilter) ([]models.TranslationCacheItem, error) {
	filter = normalizeTranslationCacheFilter(filter)
	where, args := translationCacheListWhere(filter)
	args = append(args, filter.Limit, filter.Offset)
	limitParam := len(args) - 1
	offsetParam := len(args)
	staleSQL := "tc.source_hash <> " + currentPostSourceHashSQL("p")
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
WITH translation_keys AS (
  SELECT post_id, language_code, source_language, source_hash FROM post_translations
  UNION
  SELECT post_id, language_code, source_language, source_hash FROM post_translation_jobs
)
SELECT
  COALESCE(pt.id::text, tj.id::text, ''),
  COALESCE(pt.id::text, ''),
  COALESCE(tj.id::text, ''),
  tc.post_id::text,
  p.title,
  p.slug,
  p.status,
  tc.language_code,
  tc.source_language,
  tc.source_hash,
  pt.id IS NOT NULL,
  (%s) AS stale,
  COALESCE(jsonb_array_length(pt.segments), 0) AS segment_count,
  COALESCE(octet_length(pt.title) + octet_length(pt.excerpt) + octet_length(pt.content), 0) AS content_bytes,
  COALESCE(tj.status, CASE WHEN pt.id IS NULL THEN 'running' ELSE 'succeeded' END),
  COALESCE(tj.error_message, ''),
  tj.started_at,
  tj.finished_at,
  COALESCE(pt.created_at, tj.created_at),
  COALESCE(pt.updated_at, tj.updated_at)
FROM translation_keys tc
JOIN posts p ON p.id=tc.post_id
LEFT JOIN post_translations pt ON pt.post_id=tc.post_id AND pt.language_code=tc.language_code AND pt.source_hash=tc.source_hash
LEFT JOIN post_translation_jobs tj ON tj.post_id=tc.post_id AND tj.language_code=tc.language_code AND tj.source_hash=tc.source_hash
WHERE %s
ORDER BY stale DESC,
  CASE COALESCE(tj.status, CASE WHEN pt.id IS NULL THEN 'running' ELSE 'succeeded' END)
    WHEN 'failed' THEN 0
    WHEN 'running' THEN 1
    ELSE 2
  END,
  COALESCE(pt.updated_at, tj.updated_at) DESC
LIMIT $%d OFFSET $%d`, staleSQL, where, limitParam, offsetParam), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.TranslationCacheItem{}
	for rows.Next() {
		var item models.TranslationCacheItem
		var startedAt sql.NullTime
		var finishedAt sql.NullTime
		if err := rows.Scan(
			&item.ID,
			&item.CacheID,
			&item.JobID,
			&item.PostID,
			&item.PostTitle,
			&item.PostSlug,
			&item.PostStatus,
			&item.LanguageCode,
			&item.SourceLanguage,
			&item.SourceHash,
			&item.HasCache,
			&item.Stale,
			&item.SegmentCount,
			&item.ContentBytes,
			&item.JobStatus,
			&item.JobError,
			&startedAt,
			&finishedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if startedAt.Valid {
			value := startedAt.Time
			item.JobStartedAt = &value
		}
		if finishedAt.Valid {
			value := finishedAt.Time
			item.JobFinishedAt = &value
		}
		item.LanguageCode = i18n.NormalizeLanguageCode(item.LanguageCode)
		item.SourceLanguage = i18n.NormalizeLanguageCode(item.SourceLanguage)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s Store) CountTranslationCaches(ctx context.Context, filter models.TranslationCacheFilter) (int, error) {
	where, args := translationCacheListWhere(normalizeTranslationCacheFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
WITH translation_keys AS (
  SELECT post_id, language_code, source_language, source_hash FROM post_translations
  UNION
  SELECT post_id, language_code, source_language, source_hash FROM post_translation_jobs
)
SELECT count(*)
FROM translation_keys tc
JOIN posts p ON p.id=tc.post_id
LEFT JOIN post_translations pt ON pt.post_id=tc.post_id AND pt.language_code=tc.language_code AND pt.source_hash=tc.source_hash
WHERE %s`, where), args...).Scan(&total)
	return total, err
}

func (s Store) ListTranslationCachesPage(ctx context.Context, filter models.TranslationCacheFilter) (models.PaginatedTranslationCaches, error) {
	filter = normalizeTranslationCacheFilter(filter)
	total, err := s.CountTranslationCaches(ctx, filter)
	if err != nil {
		return models.PaginatedTranslationCaches{}, err
	}
	items, err := s.ListTranslationCaches(ctx, filter)
	if err != nil {
		return models.PaginatedTranslationCaches{}, err
	}
	return models.PaginatedTranslationCaches{
		Items:  items,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (s Store) DeleteTranslationCache(ctx context.Context, id string) (int64, error) {
	var deleted int64
	err := s.pool.QueryRow(ctx, `
WITH deleted_cache AS (
  DELETE FROM post_translations
  WHERE id=$1
  RETURNING post_id, language_code, source_hash
),
deleted_job AS (
  DELETE FROM post_translation_jobs tj
  WHERE tj.id=$1 OR EXISTS (
    SELECT 1 FROM deleted_cache dc
    WHERE dc.post_id=tj.post_id AND dc.language_code=tj.language_code AND dc.source_hash=tj.source_hash
  )
  RETURNING id
)
SELECT (SELECT count(*) FROM deleted_cache) + (SELECT count(*) FROM deleted_job)`,
		strings.TrimSpace(id),
	).Scan(&deleted)
	return deleted, err
}

func (s Store) DeleteStaleTranslationCaches(ctx context.Context) (int64, error) {
	query := fmt.Sprintf(`
WITH stale_keys AS (
  SELECT pt.post_id, pt.language_code, pt.source_hash
  FROM post_translations pt
  JOIN posts p ON p.id=pt.post_id
  WHERE pt.source_hash <> %[1]s
  UNION
  SELECT tj.post_id, tj.language_code, tj.source_hash
  FROM post_translation_jobs tj
  JOIN posts p ON p.id=tj.post_id
  WHERE tj.source_hash <> %[1]s
),
deleted_cache AS (
  DELETE FROM post_translations pt
  USING stale_keys sk
  WHERE sk.post_id=pt.post_id AND sk.language_code=pt.language_code AND sk.source_hash=pt.source_hash
  RETURNING pt.id
),
deleted_job AS (
  DELETE FROM post_translation_jobs tj
  USING stale_keys sk
  WHERE sk.post_id=tj.post_id AND sk.language_code=tj.language_code AND sk.source_hash=tj.source_hash
  RETURNING tj.id
)
SELECT (SELECT count(*) FROM deleted_cache) + (SELECT count(*) FROM deleted_job)`, currentPostSourceHashSQL("p"))
	var deleted int64
	err := s.pool.QueryRow(ctx, query).Scan(&deleted)
	return deleted, err
}

func scanPostTranslation(row rowScanner) (models.PostTranslation, error) {
	var item models.PostTranslation
	var rawSegments string
	err := row.Scan(
		&item.ID,
		&item.PostID,
		&item.LanguageCode,
		&item.SourceLanguage,
		&item.SourceHash,
		&item.Title,
		&item.Excerpt,
		&item.Content,
		&rawSegments,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return item, err
	}
	return parsePostTranslationSegments(item, rawSegments)
}

func parsePostTranslationSegments(item models.PostTranslation, rawSegments string) (models.PostTranslation, error) {
	if err := json.Unmarshal([]byte(rawSegments), &item.Segments); err != nil {
		return item, err
	}
	item.LanguageCode = i18n.NormalizeLanguageCode(item.LanguageCode)
	item.SourceLanguage = i18n.NormalizeLanguageCode(item.SourceLanguage)
	return item, nil
}
