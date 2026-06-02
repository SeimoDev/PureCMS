package store

import (
	"context"
	"database/sql"
	"encoding/json"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (s Store) CreatePostRevision(ctx context.Context, postID, actorID string) (models.PostRevision, error) {
	post, err := s.GetPostByID(ctx, postID)
	if err != nil {
		return models.PostRevision{}, err
	}
	categoryIDs := make([]string, 0, len(post.Categories))
	for _, category := range post.Categories {
		categoryIDs = append(categoryIDs, category.ID)
	}
	tagIDs := make([]string, 0, len(post.Tags))
	for _, tag := range post.Tags {
		tagIDs = append(tagIDs, tag.ID)
	}

	row := s.pool.QueryRow(ctx, `
WITH next_version AS (
  SELECT COALESCE(MAX(version_number), 0) + 1 AS value
  FROM post_revisions
  WHERE post_id=$1
)
INSERT INTO post_revisions (
  post_id, version_number, title, slug, excerpt, content, source_language, cover_url, status, featured,
  seo_title, seo_description, category_ids, tag_ids, published_at, created_by
)
SELECT $1, next_version.value, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
FROM next_version
RETURNING id::text, post_id::text, version_number, title, slug, excerpt, content, source_language, cover_url, status, featured,
  seo_title, seo_description, array_to_json(category_ids)::text, array_to_json(tag_ids)::text,
  published_at, COALESCE(created_by::text, ''), created_at`,
		post.ID,
		post.Title,
		post.Slug,
		post.Excerpt,
		post.Content,
		i18n.NormalizeLanguageCode(post.SourceLanguage),
		post.CoverURL,
		post.Status,
		post.Featured,
		post.SEOTitle,
		post.SEODescription,
		categoryIDs,
		tagIDs,
		post.PublishedAt,
		nullableString(actorID),
	)
	return scanPostRevision(row)
}

func (s Store) ListPostRevisions(ctx context.Context, postID string) ([]models.PostRevision, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, post_id::text, version_number, title, slug, excerpt, content, source_language, cover_url, status, featured,
  seo_title, seo_description, array_to_json(category_ids)::text, array_to_json(tag_ids)::text,
  published_at, COALESCE(created_by::text, ''), created_at
FROM post_revisions
WHERE post_id=$1
ORDER BY version_number DESC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	revisions := []models.PostRevision{}
	for rows.Next() {
		revision, err := scanPostRevision(rows)
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, revision)
	}
	return revisions, rows.Err()
}

func (s Store) RestorePostRevision(ctx context.Context, postID, revisionID, actorID string) (models.Post, error) {
	revision, err := s.getPostRevision(ctx, postID, revisionID)
	if err != nil {
		return models.Post{}, err
	}
	slug, err := s.uniqueSlug(ctx, "posts", revision.Slug, postID)
	if err != nil {
		return models.Post{}, err
	}
	_, err = s.pool.Exec(ctx, `
UPDATE posts
SET title=$1, slug=$2, excerpt=$3, content=$4, source_language=$5, cover_url=$6, status=$7, featured=$8,
    seo_title=$9, seo_description=$10, published_at=$11
WHERE id=$12`,
		revision.Title,
		slug,
		revision.Excerpt,
		revision.Content,
		i18n.NormalizeLanguageCode(revision.SourceLanguage),
		revision.CoverURL,
		revision.Status,
		revision.Featured,
		revision.SEOTitle,
		revision.SEODescription,
		revision.PublishedAt,
		postID,
	)
	if err != nil {
		return models.Post{}, err
	}
	if err := s.syncPostRelations(ctx, postID, revision.CategoryIDs, revision.TagIDs); err != nil {
		return models.Post{}, err
	}
	if _, err := s.CreatePostRevision(ctx, postID, actorID); err != nil {
		return models.Post{}, err
	}
	return s.GetPostByID(ctx, postID)
}

func (s Store) getPostRevision(ctx context.Context, postID, revisionID string) (models.PostRevision, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, post_id::text, version_number, title, slug, excerpt, content, source_language, cover_url, status, featured,
  seo_title, seo_description, array_to_json(category_ids)::text, array_to_json(tag_ids)::text,
  published_at, COALESCE(created_by::text, ''), created_at
FROM post_revisions
WHERE post_id=$1 AND id=$2`, postID, revisionID)
	return scanPostRevision(row)
}

func (s Store) ListAllPostRevisions(ctx context.Context) ([]models.PostRevision, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, post_id::text, version_number, title, slug, excerpt, content, source_language, cover_url, status, featured,
  seo_title, seo_description, array_to_json(category_ids)::text, array_to_json(tag_ids)::text,
  published_at, COALESCE(created_by::text, ''), created_at
FROM post_revisions
ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	revisions := []models.PostRevision{}
	for rows.Next() {
		revision, err := scanPostRevision(rows)
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, revision)
	}
	return revisions, rows.Err()
}

func scanPostRevision(row rowScanner) (models.PostRevision, error) {
	var revision models.PostRevision
	var categoryIDsRaw string
	var tagIDsRaw string
	var publishedAt sql.NullTime
	err := row.Scan(
		&revision.ID,
		&revision.PostID,
		&revision.VersionNumber,
		&revision.Title,
		&revision.Slug,
		&revision.Excerpt,
		&revision.Content,
		&revision.SourceLanguage,
		&revision.CoverURL,
		&revision.Status,
		&revision.Featured,
		&revision.SEOTitle,
		&revision.SEODescription,
		&categoryIDsRaw,
		&tagIDsRaw,
		&publishedAt,
		&revision.CreatedBy,
		&revision.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return revision, err
		}
		return revision, err
	}
	if err := json.Unmarshal([]byte(categoryIDsRaw), &revision.CategoryIDs); err != nil {
		return revision, err
	}
	if err := json.Unmarshal([]byte(tagIDsRaw), &revision.TagIDs); err != nil {
		return revision, err
	}
	revision.SourceLanguage = i18n.NormalizeLanguageCode(revision.SourceLanguage)
	if publishedAt.Valid {
		value := publishedAt.Time
		revision.PublishedAt = &value
	}
	return revision, nil
}
