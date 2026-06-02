package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func NormalizePageInput(input models.PageInput) (models.PageInput, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = BuildSlug(input.Slug, input.Title)
	input.Content = strings.TrimSpace(input.Content)
	input.Status = normalizeStatus(input.Status)
	input.NavLabel = strings.TrimSpace(input.NavLabel)
	input.SEOTitle = strings.TrimSpace(input.SEOTitle)
	input.SEODescription = strings.TrimSpace(input.SEODescription)

	if input.Title == "" {
		return input, errors.New("page title is required")
	}
	return input, nil
}

const defaultPageListLimit = 10
const maxPageListLimit = 200

func normalizePageFilter(filter models.PageFilter) models.PageFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultPageListLimit
	}
	if filter.Limit > maxPageListLimit {
		filter.Limit = maxPageListLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Status = strings.ToLower(strings.TrimSpace(filter.Status))
	if filter.Status != "published" && filter.Status != "draft" && filter.Status != "archived" {
		filter.Status = ""
	}
	filter.Nav = strings.ToLower(strings.TrimSpace(filter.Nav))
	if filter.Nav != "shown" && filter.Nav != "hidden" {
		filter.Nav = ""
	}
	return filter
}

func pageListWhere(filter models.PageFilter) (string, []any) {
	filter = normalizePageFilter(filter)
	args := []any{}
	conditions := []string{}
	if filter.Admin {
		if !filter.IncludeDeleted {
			conditions = append(conditions, deletedContentSQLCondition("pages", filter.Deleted))
		}
		if filter.Status != "" {
			args = append(args, filter.Status)
			conditions = append(conditions, fmt.Sprintf("status=$%d", len(args)))
		}
		switch filter.Nav {
		case "shown":
			conditions = append(conditions, "show_in_nav=true")
		case "hidden":
			conditions = append(conditions, "show_in_nav=false")
		}
	} else {
		conditions = append(conditions, "deleted_at IS NULL", "status='published'", "show_in_nav=true")
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		conditions = append(conditions, fmt.Sprintf(`(
  title ILIKE $%d OR
  slug ILIKE $%d OR
  content ILIKE $%d OR
  nav_label ILIKE $%d OR
  seo_title ILIKE $%d OR
  seo_description ILIKE $%d
)`, len(args), len(args), len(args), len(args), len(args), len(args)))
	}
	if len(conditions) == 0 {
		return "1=1", args
	}
	return strings.Join(conditions, " AND "), args
}

func (s Store) ListPages(ctx context.Context, filter models.PageFilter) ([]models.Page, error) {
	usePagination := filter.Limit > 0 || filter.Offset > 0
	normalized := normalizePageFilter(filter)
	condition, args := pageListWhere(normalized)
	query := `
SELECT id::text, title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description, created_at, updated_at, deleted_at
FROM pages
WHERE %s
ORDER BY sort_order ASC, title ASC`
	if usePagination {
		args = append(args, normalized.Limit, normalized.Offset)
		query += fmt.Sprintf(`
LIMIT $%d OFFSET $%d`, len(args)-1, len(args))
	}
	rows, err := s.pool.Query(ctx, fmt.Sprintf(query, condition), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pages := []models.Page{}
	for rows.Next() {
		page, err := scanPage(rows)
		if err != nil {
			return nil, err
		}
		pages = append(pages, page)
	}
	return pages, rows.Err()
}

func (s Store) CountPages(ctx context.Context, filter models.PageFilter) (int, error) {
	condition, args := pageListWhere(normalizePageFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT count(*)
FROM pages
WHERE %s`, condition), args...).Scan(&total)
	return total, err
}

func (s Store) ListPagesPage(ctx context.Context, filter models.PageFilter) (models.PaginatedPages, error) {
	filter = normalizePageFilter(filter)
	total, err := s.CountPages(ctx, filter)
	if err != nil {
		return models.PaginatedPages{}, err
	}
	pages, err := s.ListPages(ctx, filter)
	if err != nil {
		return models.PaginatedPages{}, err
	}
	return models.PaginatedPages{
		Items:  pages,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (s Store) GetPageBySlug(ctx context.Context, slug string, admin bool) (models.Page, error) {
	condition := "slug=$1"
	if !admin {
		condition += " AND deleted_at IS NULL AND status='published'"
	}
	return s.getPage(ctx, condition, slug)
}

func (s Store) GetPageByID(ctx context.Context, id string) (models.Page, error) {
	return s.getPage(ctx, "id=$1", id)
}

func (s Store) getPage(ctx context.Context, condition string, arg any) (models.Page, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description, created_at, updated_at, deleted_at
FROM pages
WHERE `+condition, arg)
	return scanPage(row)
}

func (s Store) CreatePage(ctx context.Context, input models.PageInput) (models.Page, error) {
	normalized, err := NormalizePageInput(input)
	if err != nil {
		return models.Page{}, err
	}
	slug, err := s.uniqueSlug(ctx, "pages", normalized.Slug, "")
	if err != nil {
		return models.Page{}, err
	}
	row := s.pool.QueryRow(ctx, `
INSERT INTO pages (title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
RETURNING id::text, title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description, created_at, updated_at, deleted_at`,
		normalized.Title,
		slug,
		normalized.Content,
		normalized.Status,
		normalized.ShowInNav,
		normalized.NavLabel,
		normalized.SortOrder,
		normalized.SEOTitle,
		normalized.SEODescription,
	)
	page, err := scanPage(row)
	if err != nil {
		return models.Page{}, err
	}
	if _, err := s.CreatePageRevision(ctx, page.ID, ""); err != nil {
		return models.Page{}, err
	}
	return page, nil
}

func (s Store) UpdatePage(ctx context.Context, id string, input models.PageInput, actorIDs ...string) (models.Page, error) {
	normalized, err := NormalizePageInput(input)
	if err != nil {
		return models.Page{}, err
	}
	slug, err := s.uniqueSlug(ctx, "pages", normalized.Slug, id)
	if err != nil {
		return models.Page{}, err
	}
	row := s.pool.QueryRow(ctx, `
UPDATE pages
SET title=$1, slug=$2, content=$3, status=$4, show_in_nav=$5, nav_label=$6, sort_order=$7, seo_title=$8, seo_description=$9
WHERE id=$10
RETURNING id::text, title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description, created_at, updated_at, deleted_at`,
		normalized.Title,
		slug,
		normalized.Content,
		normalized.Status,
		normalized.ShowInNav,
		normalized.NavLabel,
		normalized.SortOrder,
		normalized.SEOTitle,
		normalized.SEODescription,
		id,
	)
	page, err := scanPage(row)
	if err != nil {
		return models.Page{}, err
	}
	actorID := ""
	if len(actorIDs) > 0 {
		actorID = actorIDs[0]
	}
	if _, err := s.CreatePageRevision(ctx, page.ID, actorID); err != nil {
		return models.Page{}, err
	}
	return page, nil
}

func (s Store) DeletePage(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "UPDATE pages SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) RestorePage(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "UPDATE pages SET deleted_at=NULL WHERE id=$1 AND deleted_at IS NOT NULL", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) PermanentlyDeletePage(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM pages WHERE id=$1 AND deleted_at IS NOT NULL", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func scanPage(row rowScanner) (models.Page, error) {
	var page models.Page
	var deletedAt sql.NullTime
	err := row.Scan(
		&page.ID,
		&page.Title,
		&page.Slug,
		&page.Content,
		&page.Status,
		&page.ShowInNav,
		&page.NavLabel,
		&page.SortOrder,
		&page.SEOTitle,
		&page.SEODescription,
		&page.CreatedAt,
		&page.UpdatedAt,
		&deletedAt,
	)
	if deletedAt.Valid {
		value := deletedAt.Time
		page.DeletedAt = &value
	}
	return page, err
}
