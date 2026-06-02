package store

import (
	"context"

	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (s Store) CreatePageRevision(ctx context.Context, pageID, actorID string) (models.PageRevision, error) {
	page, err := s.GetPageByID(ctx, pageID)
	if err != nil {
		return models.PageRevision{}, err
	}

	row := s.pool.QueryRow(ctx, `
WITH next_version AS (
  SELECT COALESCE(MAX(version_number), 0) + 1 AS value
  FROM page_revisions
  WHERE page_id=$1
)
INSERT INTO page_revisions (
  page_id, version_number, title, slug, content, status, show_in_nav, nav_label,
  sort_order, seo_title, seo_description, created_by
)
SELECT $1, next_version.value, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
FROM next_version
RETURNING id::text, page_id::text, version_number, title, slug, content, status, show_in_nav,
  nav_label, sort_order, seo_title, seo_description, COALESCE(created_by::text, ''), created_at`,
		page.ID,
		page.Title,
		page.Slug,
		page.Content,
		page.Status,
		page.ShowInNav,
		page.NavLabel,
		page.SortOrder,
		page.SEOTitle,
		page.SEODescription,
		nullableString(actorID),
	)
	return scanPageRevision(row)
}

func (s Store) ListPageRevisions(ctx context.Context, pageID string) ([]models.PageRevision, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, page_id::text, version_number, title, slug, content, status, show_in_nav,
  nav_label, sort_order, seo_title, seo_description, COALESCE(created_by::text, ''), created_at
FROM page_revisions
WHERE page_id=$1
ORDER BY version_number DESC`, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	revisions := []models.PageRevision{}
	for rows.Next() {
		revision, err := scanPageRevision(rows)
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, revision)
	}
	return revisions, rows.Err()
}

func (s Store) RestorePageRevision(ctx context.Context, pageID, revisionID, actorID string) (models.Page, error) {
	revision, err := s.getPageRevision(ctx, pageID, revisionID)
	if err != nil {
		return models.Page{}, err
	}
	slug, err := s.uniqueSlug(ctx, "pages", revision.Slug, pageID)
	if err != nil {
		return models.Page{}, err
	}
	_, err = s.pool.Exec(ctx, `
UPDATE pages
SET title=$1, slug=$2, content=$3, status=$4, show_in_nav=$5, nav_label=$6,
    sort_order=$7, seo_title=$8, seo_description=$9
WHERE id=$10`,
		revision.Title,
		slug,
		revision.Content,
		revision.Status,
		revision.ShowInNav,
		revision.NavLabel,
		revision.SortOrder,
		revision.SEOTitle,
		revision.SEODescription,
		pageID,
	)
	if err != nil {
		return models.Page{}, err
	}
	if _, err := s.CreatePageRevision(ctx, pageID, actorID); err != nil {
		return models.Page{}, err
	}
	return s.GetPageByID(ctx, pageID)
}

func (s Store) getPageRevision(ctx context.Context, pageID, revisionID string) (models.PageRevision, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, page_id::text, version_number, title, slug, content, status, show_in_nav,
  nav_label, sort_order, seo_title, seo_description, COALESCE(created_by::text, ''), created_at
FROM page_revisions
WHERE page_id=$1 AND id=$2`, pageID, revisionID)
	return scanPageRevision(row)
}

func (s Store) ListAllPageRevisions(ctx context.Context) ([]models.PageRevision, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, page_id::text, version_number, title, slug, content, status, show_in_nav,
  nav_label, sort_order, seo_title, seo_description, COALESCE(created_by::text, ''), created_at
FROM page_revisions
ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	revisions := []models.PageRevision{}
	for rows.Next() {
		revision, err := scanPageRevision(rows)
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, revision)
	}
	return revisions, rows.Err()
}

func scanPageRevision(row rowScanner) (models.PageRevision, error) {
	var revision models.PageRevision
	err := row.Scan(
		&revision.ID,
		&revision.PageID,
		&revision.VersionNumber,
		&revision.Title,
		&revision.Slug,
		&revision.Content,
		&revision.Status,
		&revision.ShowInNav,
		&revision.NavLabel,
		&revision.SortOrder,
		&revision.SEOTitle,
		&revision.SEODescription,
		&revision.CreatedBy,
		&revision.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return revision, err
		}
		return revision, err
	}
	return revision, nil
}
