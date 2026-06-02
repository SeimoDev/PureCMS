package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var slugSeparators = regexp.MustCompile(`[^\p{L}\p{N}]+`)

const defaultPostPageLimit = 20
const maxPostPageLimit = 50
const defaultCommentPageLimit = 20
const maxCommentPageLimit = 100

const commentSelectColumns = `
  c.id::text, c.post_id::text, p.title, p.slug,
  COALESCE(c.parent_id::text, ''), COALESCE(parent.author_name, ''),
  COALESCE(c.author_user_id::text, ''), c.is_admin_reply,
  c.author_name, c.email, c.website, c.content, c.status, c.ip_address, c.user_agent, c.created_at`

const commentJoins = `
JOIN posts p ON p.id=c.post_id
LEFT JOIN comments parent ON parent.id=c.parent_id`

type Store struct {
	pool *pgxpool.Pool
}

type TaxonomyInUseError struct {
	Kind  string
	Count int
}

func (e TaxonomyInUseError) Error() string {
	return "taxonomy " + e.Kind + " is in use"
}

func New(pool *pgxpool.Pool) Store {
	return Store{pool: pool}
}

func BuildSlug(value, fallback string) string {
	base := strings.TrimSpace(value)
	if base == "" {
		base = fallback
	}
	base = strings.ToLower(base)
	base = slugSeparators.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		base = fmt.Sprintf("post-%d", time.Now().Unix())
	}
	return base
}

func normalizeStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "published", "archived":
		return status
	default:
		return "draft"
	}
}

func IsPubliclyVisiblePost(status string, publishedAt *time.Time, now time.Time) bool {
	if status != "published" {
		return false
	}
	return publishedAt == nil || !publishedAt.After(now)
}

func deletedContentSQLCondition(alias string, deletedOnly bool) string {
	if deletedOnly {
		return alias + ".deleted_at IS NOT NULL"
	}
	return alias + ".deleted_at IS NULL"
}

func publicPostSQLCondition(alias string) string {
	return deletedContentSQLCondition(alias, false) + " AND " + alias + ".status='published' AND (" + alias + ".published_at IS NULL OR " + alias + ".published_at <= now())"
}

func publicPostRelationSQLCondition(alias string) string {
	return publicPostSQLCondition(alias)
}

func normalizePostFilter(filter models.PostFilter) models.PostFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultPostPageLimit
	}
	if filter.Limit > maxPostPageLimit {
		filter.Limit = maxPostPageLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	return filter
}

func postListWhere(filter models.PostFilter) (string, []any) {
	args := []any{}
	conditions := []string{"1=1"}
	if !filter.Admin {
		conditions = append(conditions, publicPostSQLCondition("p"))
	} else {
		conditions = append(conditions, deletedContentSQLCondition("p", filter.Deleted))
		if filter.Scheduled {
			conditions = append(conditions, "p.status='published'", "p.published_at > now()")
		}
		if filter.Status != "" {
			args = append(args, filter.Status)
			conditions = append(conditions, fmt.Sprintf("p.status=$%d", len(args)))
		}
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		conditions = append(conditions, fmt.Sprintf(`(
  p.title ILIKE $%d OR p.slug ILIKE $%d OR p.excerpt ILIKE $%d OR p.content ILIKE $%d OR
  p.seo_title ILIKE $%d OR p.seo_description ILIKE $%d OR
  EXISTS (
    SELECT 1 FROM post_categories search_pc
    JOIN categories search_c ON search_c.id=search_pc.category_id
    WHERE search_pc.post_id=p.id AND (search_c.name ILIKE $%d OR search_c.slug ILIKE $%d)
  ) OR
  EXISTS (
    SELECT 1 FROM post_tags search_pt
    JOIN tags search_t ON search_t.id=search_pt.tag_id
    WHERE search_pt.post_id=p.id AND (search_t.name ILIKE $%d OR search_t.slug ILIKE $%d)
  ) OR
  EXISTS (
    SELECT 1 FROM users search_u
    WHERE search_u.id=p.author_id AND (search_u.display_name ILIKE $%d OR search_u.username ILIKE $%d)
  )
)`, len(args), len(args), len(args), len(args), len(args), len(args), len(args), len(args), len(args), len(args), len(args), len(args)))
	}
	if filter.Featured != nil {
		args = append(args, *filter.Featured)
		conditions = append(conditions, fmt.Sprintf("p.featured=$%d", len(args)))
	}
	if filter.Category != "" {
		args = append(args, filter.Category)
		conditions = append(conditions, fmt.Sprintf(`EXISTS (
  SELECT 1 FROM post_categories pc
  JOIN categories c ON c.id=pc.category_id
  WHERE pc.post_id=p.id AND c.slug=$%d
)`, len(args)))
	}
	if filter.Tag != "" {
		args = append(args, filter.Tag)
		conditions = append(conditions, fmt.Sprintf(`EXISTS (
  SELECT 1 FROM post_tags pt
  JOIN tags t ON t.id=pt.tag_id
  WHERE pt.post_id=p.id AND t.slug=$%d
)`, len(args)))
	}
	return strings.Join(conditions, " AND "), args
}

func normalizeCommentFilter(filter models.CommentFilter) models.CommentFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultCommentPageLimit
	}
	if filter.Limit > maxCommentPageLimit {
		filter.Limit = maxCommentPageLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Status = strings.TrimSpace(filter.Status)
	return filter
}

func commentListWhere(filter models.CommentFilter) (string, []any) {
	filter = normalizeCommentFilter(filter)
	args := []any{}
	conditions := []string{"1=1"}
	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("c.status=$%d", len(args)))
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		conditions = append(conditions, fmt.Sprintf(`(
  c.author_name ILIKE $%d OR
  c.email ILIKE $%d OR
  c.website ILIKE $%d OR
  c.content ILIKE $%d OR
  parent.author_name ILIKE $%d OR
  parent.content ILIKE $%d OR
  p.title ILIKE $%d OR
  p.slug ILIKE $%d
)`, len(args), len(args), len(args), len(args), len(args), len(args), len(args), len(args)))
	}
	return strings.Join(conditions, " AND "), args
}

func (s Store) GetUserByUsername(ctx context.Context, username string) (models.User, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at
FROM users
WHERE username=$1`, username)
	return scanUser(row)
}

func (s Store) Dashboard(ctx context.Context) (models.DashboardStats, error) {
	var stats models.DashboardStats
	err := s.pool.QueryRow(ctx, dashboardStatsSQL()).Scan(
		&stats.Posts,
		&stats.PublishedPosts,
		&stats.ScheduledPosts,
		&stats.FeaturedPosts,
		&stats.DraftPosts,
		&stats.PendingComments,
		&stats.ApprovedComments,
		&stats.Categories,
		&stats.Tags,
		&stats.Views,
		&stats.Users,
		&stats.MediaAssets,
		&stats.ActivityLogs,
	)
	return stats, err
}

func dashboardStatsSQL() string {
	return `
SELECT
  (SELECT count(*) FROM posts WHERE deleted_at IS NULL),
  (SELECT count(*) FROM posts WHERE deleted_at IS NULL AND status='published' AND (published_at IS NULL OR published_at <= now())),
  (SELECT count(*) FROM posts WHERE deleted_at IS NULL AND status='published' AND published_at > now()),
  (SELECT count(*) FROM posts WHERE deleted_at IS NULL AND featured=true),
  (SELECT count(*) FROM posts WHERE deleted_at IS NULL AND status='draft'),
  (SELECT count(*) FROM comments WHERE status='pending'),
  (SELECT count(*) FROM comments WHERE status='approved'),
  (SELECT count(*) FROM categories),
  (SELECT count(*) FROM tags),
  COALESCE((SELECT sum(view_count) FROM posts WHERE deleted_at IS NULL), 0),
  (SELECT count(*) FROM users),
  (SELECT count(*) FROM media_assets),
  (SELECT count(*) FROM activity_logs)
`
}

func (s Store) ListPosts(ctx context.Context, filter models.PostFilter) ([]models.Post, error) {
	filter = normalizePostFilter(filter)
	where, args := postListWhere(filter)

	args = append(args, filter.Limit, filter.Offset)
	query := fmt.Sprintf(`
SELECT
  p.id::text, p.title, p.slug, p.excerpt, p.content, p.source_language, p.cover_url, p.status, p.featured,
  p.seo_title, p.seo_description, COALESCE(p.author_id::text, ''), COALESCE(u.display_name, ''),
  p.view_count,
  (SELECT count(*) FROM comments c WHERE c.post_id=p.id AND c.status='approved') AS comment_count,
  p.published_at, p.created_at, p.updated_at, p.deleted_at
FROM posts p
LEFT JOIN users u ON u.id=p.author_id
WHERE %s
ORDER BY p.featured DESC, COALESCE(p.published_at, p.created_at) DESC
LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := []models.Post{}
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		if err := s.attachPostRelations(ctx, &post); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func (s Store) CountPosts(ctx context.Context, filter models.PostFilter) (int, error) {
	where, args := postListWhere(normalizePostFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT count(*)
FROM posts p
WHERE %s`, where), args...).Scan(&total)
	return total, err
}

func (s Store) ListPostsPage(ctx context.Context, filter models.PostFilter) (models.PaginatedPosts, error) {
	filter = normalizePostFilter(filter)
	total, err := s.CountPosts(ctx, filter)
	if err != nil {
		return models.PaginatedPosts{}, err
	}
	posts, err := s.ListPosts(ctx, filter)
	if err != nil {
		return models.PaginatedPosts{}, err
	}
	return models.PaginatedPosts{
		Items:  posts,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (s Store) GetPostBySlug(ctx context.Context, slug string, admin bool) (models.Post, error) {
	condition := "p.slug=$1"
	if !admin {
		condition += " AND " + publicPostSQLCondition("p")
	}
	post, err := s.getPost(ctx, condition, slug)
	if err != nil {
		return post, err
	}
	if !admin {
		_ = s.IncrementPostViews(ctx, post.ID)
		post.ViewCount++
	}
	return post, nil
}

func (s Store) GetPublicPostBySlugWithoutView(ctx context.Context, slug string) (models.Post, error) {
	return s.getPost(ctx, "p.slug=$1 AND "+publicPostSQLCondition("p"), slug)
}

func (s Store) GetPostByID(ctx context.Context, id string) (models.Post, error) {
	return s.getPost(ctx, "p.id=$1", id)
}

func (s Store) getPost(ctx context.Context, condition string, arg any) (models.Post, error) {
	row := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT
  p.id::text, p.title, p.slug, p.excerpt, p.content, p.source_language, p.cover_url, p.status, p.featured,
  p.seo_title, p.seo_description, COALESCE(p.author_id::text, ''), COALESCE(u.display_name, ''),
  p.view_count,
  (SELECT count(*) FROM comments c WHERE c.post_id=p.id AND c.status='approved') AS comment_count,
  p.published_at, p.created_at, p.updated_at, p.deleted_at
FROM posts p
LEFT JOIN users u ON u.id=p.author_id
WHERE %s`, condition), arg)
	post, err := scanPost(row)
	if err != nil {
		return post, err
	}
	return post, s.attachPostRelations(ctx, &post)
}

func (s Store) CreatePost(ctx context.Context, input models.PostInput, authorID string) (models.Post, error) {
	input.Status = normalizeStatus(input.Status)
	input.SourceLanguage = i18n.NormalizeLanguageCode(input.SourceLanguage)
	slug, err := s.uniqueSlug(ctx, "posts", BuildSlug(input.Slug, input.Title), "")
	if err != nil {
		return models.Post{}, err
	}
	publishedAt := nullablePublishedAt(input.Status, input.PublishedAt, nil)

	var id string
	err = s.pool.QueryRow(ctx, `
INSERT INTO posts (title, slug, excerpt, content, source_language, cover_url, status, featured, seo_title, seo_description, author_id, published_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
RETURNING id::text`,
		strings.TrimSpace(input.Title),
		slug,
		strings.TrimSpace(input.Excerpt),
		input.Content,
		input.SourceLanguage,
		strings.TrimSpace(input.CoverURL),
		input.Status,
		input.Featured,
		strings.TrimSpace(input.SEOTitle),
		strings.TrimSpace(input.SEODescription),
		authorID,
		publishedAt,
	).Scan(&id)
	if err != nil {
		return models.Post{}, err
	}
	if err := s.syncPostRelations(ctx, id, input.CategoryIDs, input.TagIDs); err != nil {
		return models.Post{}, err
	}
	if _, err := s.CreatePostRevision(ctx, id, authorID); err != nil {
		return models.Post{}, err
	}
	return s.GetPostByID(ctx, id)
}

func (s Store) UpdatePost(ctx context.Context, id string, input models.PostInput, actorID string) (models.Post, error) {
	existing, err := s.GetPostByID(ctx, id)
	if err != nil {
		return models.Post{}, err
	}
	input.Status = normalizeStatus(input.Status)
	input.SourceLanguage = i18n.NormalizeLanguageCode(input.SourceLanguage)
	slug, err := s.uniqueSlug(ctx, "posts", BuildSlug(input.Slug, input.Title), id)
	if err != nil {
		return models.Post{}, err
	}
	publishedAt := nullablePublishedAt(input.Status, input.PublishedAt, existing.PublishedAt)

	_, err = s.pool.Exec(ctx, `
UPDATE posts
SET title=$1, slug=$2, excerpt=$3, content=$4, source_language=$5, cover_url=$6, status=$7, featured=$8,
    seo_title=$9, seo_description=$10, published_at=$11
WHERE id=$12`,
		strings.TrimSpace(input.Title),
		slug,
		strings.TrimSpace(input.Excerpt),
		input.Content,
		input.SourceLanguage,
		strings.TrimSpace(input.CoverURL),
		input.Status,
		input.Featured,
		strings.TrimSpace(input.SEOTitle),
		strings.TrimSpace(input.SEODescription),
		publishedAt,
		id,
	)
	if err != nil {
		return models.Post{}, err
	}
	if err := s.syncPostRelations(ctx, id, input.CategoryIDs, input.TagIDs); err != nil {
		return models.Post{}, err
	}
	if _, err := s.CreatePostRevision(ctx, id, actorID); err != nil {
		return models.Post{}, err
	}
	return s.GetPostByID(ctx, id)
}

func (s Store) DeletePost(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "UPDATE posts SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) RestorePost(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "UPDATE posts SET deleted_at=NULL WHERE id=$1 AND deleted_at IS NOT NULL", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) PermanentlyDeletePost(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM posts WHERE id=$1 AND deleted_at IS NOT NULL", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) IncrementPostViews(ctx context.Context, id string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, "UPDATE posts SET view_count=view_count+1 WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	day := ViewDayInLocation(time.Now(), analyticsLocation)
	if _, err := tx.Exec(ctx, `
INSERT INTO post_view_stats (day, post_id, views)
VALUES ($1,$2,1)
ON CONFLICT (day, post_id) DO UPDATE SET views=post_view_stats.views+1`, day, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func nullablePublishedAt(status string, requested *time.Time, existing *time.Time) any {
	if status != "published" {
		return nil
	}
	if requested != nil {
		return *requested
	}
	if existing != nil {
		return *existing
	}
	return time.Now()
}

func (s Store) syncPostRelations(ctx context.Context, postID string, categoryIDs, tagIDs []string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM post_categories WHERE post_id=$1", postID); err != nil {
		return err
	}
	for _, id := range categoryIDs {
		if strings.TrimSpace(id) == "" {
			continue
		}
		if _, err := tx.Exec(ctx, "INSERT INTO post_categories (post_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", postID, id); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, "DELETE FROM post_tags WHERE post_id=$1", postID); err != nil {
		return err
	}
	for _, id := range tagIDs {
		if strings.TrimSpace(id) == "" {
			continue
		}
		if _, err := tx.Exec(ctx, "INSERT INTO post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", postID, id); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s Store) ListCategories(ctx context.Context) ([]models.Category, error) {
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
SELECT c.id::text, c.name, c.slug, c.description, c.sort_order,
  (SELECT count(*) FROM post_categories pc JOIN posts p ON p.id=pc.post_id WHERE pc.category_id=c.id AND %s) AS post_count,
  (SELECT count(*) FROM post_categories pc JOIN posts p ON p.id=pc.post_id WHERE pc.category_id=c.id AND p.deleted_at IS NULL) AS reference_count,
  c.created_at
FROM categories c
ORDER BY c.sort_order ASC, c.name ASC`, publicPostRelationSQLCondition("p")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var item models.Category
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.Description, &item.SortOrder, &item.PostCount, &item.ReferenceCount, &item.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, item)
	}
	return categories, rows.Err()
}

func (s Store) CreateCategory(ctx context.Context, input models.Category) (models.Category, error) {
	slug, err := s.uniqueSlug(ctx, "categories", BuildSlug(input.Slug, input.Name), "")
	if err != nil {
		return models.Category{}, err
	}
	var out models.Category
	err = s.pool.QueryRow(ctx, `
INSERT INTO categories (name, slug, description, sort_order)
VALUES ($1,$2,$3,$4)
RETURNING id::text, name, slug, description, sort_order, 0, 0, created_at`,
		strings.TrimSpace(input.Name), slug, strings.TrimSpace(input.Description), input.SortOrder,
	).Scan(&out.ID, &out.Name, &out.Slug, &out.Description, &out.SortOrder, &out.PostCount, &out.ReferenceCount, &out.CreatedAt)
	return out, err
}

func (s Store) UpdateCategory(ctx context.Context, id string, input models.Category) (models.Category, error) {
	slug, err := s.uniqueSlug(ctx, "categories", BuildSlug(input.Slug, input.Name), id)
	if err != nil {
		return models.Category{}, err
	}
	var out models.Category
	err = s.pool.QueryRow(ctx, fmt.Sprintf(`
UPDATE categories
SET name=$1, slug=$2, description=$3, sort_order=$4
WHERE id=$5
RETURNING id::text, name, slug, description, sort_order,
  (SELECT count(*) FROM post_categories pc JOIN posts p ON p.id=pc.post_id WHERE pc.category_id=categories.id AND %s),
  (SELECT count(*) FROM post_categories pc JOIN posts p ON p.id=pc.post_id WHERE pc.category_id=categories.id AND p.deleted_at IS NULL),
  created_at`,
		publicPostRelationSQLCondition("p")),
		strings.TrimSpace(input.Name), slug, strings.TrimSpace(input.Description), input.SortOrder, id,
	).Scan(&out.ID, &out.Name, &out.Slug, &out.Description, &out.SortOrder, &out.PostCount, &out.ReferenceCount, &out.CreatedAt)
	return out, err
}

func (s Store) DeleteCategory(ctx context.Context, id string) error {
	count, err := s.CountCategoryReferences(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return TaxonomyInUseError{Kind: "category", Count: count}
	}
	tag, err := s.pool.Exec(ctx, "DELETE FROM categories WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) CountCategoryReferences(ctx context.Context, id string) (int, error) {
	return s.countTaxonomyReferences(ctx, "post_categories", "category_id", id)
}

func (s Store) ListTags(ctx context.Context) ([]models.Tag, error) {
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
SELECT t.id::text, t.name, t.slug,
  (SELECT count(*) FROM post_tags pt JOIN posts p ON p.id=pt.post_id WHERE pt.tag_id=t.id AND %s) AS post_count,
  (SELECT count(*) FROM post_tags pt JOIN posts p ON p.id=pt.post_id WHERE pt.tag_id=t.id AND p.deleted_at IS NULL) AS reference_count,
  t.created_at
FROM tags t
ORDER BY t.name ASC`, publicPostRelationSQLCondition("p")))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []models.Tag{}
	for rows.Next() {
		var item models.Tag
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.PostCount, &item.ReferenceCount, &item.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, item)
	}
	return tags, rows.Err()
}

func (s Store) CreateTag(ctx context.Context, input models.Tag) (models.Tag, error) {
	slug, err := s.uniqueSlug(ctx, "tags", BuildSlug(input.Slug, input.Name), "")
	if err != nil {
		return models.Tag{}, err
	}
	var out models.Tag
	err = s.pool.QueryRow(ctx, `
INSERT INTO tags (name, slug)
VALUES ($1,$2)
RETURNING id::text, name, slug, 0, 0, created_at`,
		strings.TrimSpace(input.Name), slug,
	).Scan(&out.ID, &out.Name, &out.Slug, &out.PostCount, &out.ReferenceCount, &out.CreatedAt)
	return out, err
}

func (s Store) UpdateTag(ctx context.Context, id string, input models.Tag) (models.Tag, error) {
	slug, err := s.uniqueSlug(ctx, "tags", BuildSlug(input.Slug, input.Name), id)
	if err != nil {
		return models.Tag{}, err
	}
	var out models.Tag
	err = s.pool.QueryRow(ctx, fmt.Sprintf(`
UPDATE tags
SET name=$1, slug=$2
WHERE id=$3
RETURNING id::text, name, slug,
  (SELECT count(*) FROM post_tags pt JOIN posts p ON p.id=pt.post_id WHERE pt.tag_id=tags.id AND %s),
  (SELECT count(*) FROM post_tags pt JOIN posts p ON p.id=pt.post_id WHERE pt.tag_id=tags.id AND p.deleted_at IS NULL),
  created_at`,
		publicPostRelationSQLCondition("p")),
		strings.TrimSpace(input.Name), slug, id,
	).Scan(&out.ID, &out.Name, &out.Slug, &out.PostCount, &out.ReferenceCount, &out.CreatedAt)
	return out, err
}

func (s Store) DeleteTag(ctx context.Context, id string) error {
	count, err := s.CountTagReferences(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return TaxonomyInUseError{Kind: "tag", Count: count}
	}
	tag, err := s.pool.Exec(ctx, "DELETE FROM tags WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) CountTagReferences(ctx context.Context, id string) (int, error) {
	return s.countTaxonomyReferences(ctx, "post_tags", "tag_id", id)
}

func (s Store) countTaxonomyReferences(ctx context.Context, relationTable, relationColumn, id string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, taxonomyReferenceCountSQL(relationTable, relationColumn), id).Scan(&count)
	return count, err
}

func taxonomyReferenceCountSQL(relationTable, relationColumn string) string {
	return fmt.Sprintf(`
SELECT count(*)
FROM %s rel
JOIN posts p ON p.id=rel.post_id
WHERE rel.%s=$1 AND p.deleted_at IS NULL`, relationTable, relationColumn)
}

func (s Store) CreateComment(ctx context.Context, postID string, input models.CommentInput, status, ip, userAgent string) (models.Comment, error) {
	parentID := strings.TrimSpace(input.ParentID)
	if err := s.validatePublicCommentParent(ctx, postID, parentID); err != nil {
		return models.Comment{}, err
	}
	var id string
	err := s.pool.QueryRow(ctx, `
INSERT INTO comments (post_id, parent_id, author_name, email, website, content, status, ip_address, user_agent)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
RETURNING id::text`,
		postID,
		nullableString(parentID),
		strings.TrimSpace(input.AuthorName),
		strings.TrimSpace(input.Email),
		strings.TrimSpace(input.Website),
		strings.TrimSpace(input.Content),
		status,
		ip,
		userAgent,
	).Scan(&id)
	if err != nil {
		return models.Comment{}, err
	}
	return s.GetCommentByID(ctx, id)
}

func (s Store) validatePublicCommentParent(ctx context.Context, postID, parentID string) error {
	if strings.TrimSpace(parentID) == "" {
		return nil
	}
	var exists bool
	if err := s.pool.QueryRow(ctx, `
SELECT EXISTS (
  SELECT 1
  FROM comments
  WHERE id=$1 AND post_id=$2 AND status='approved'
)`, parentID, postID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) GetCommentByID(ctx context.Context, id string) (models.Comment, error) {
	row := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT %s
FROM comments c
%s
WHERE c.id=$1`, commentSelectColumns, commentJoins), id)
	return scanComment(row)
}

func (s Store) CreateAdminCommentReply(ctx context.Context, parentID, authorUserID, authorName, content string) (models.Comment, error) {
	parent, err := s.GetCommentByID(ctx, parentID)
	if err != nil {
		return models.Comment{}, err
	}
	if parent.Status == "spam" {
		return models.Comment{}, errors.New("cannot reply to spam comment")
	}
	var id string
	err = s.pool.QueryRow(ctx, `
INSERT INTO comments (post_id, parent_id, author_name, email, website, content, status, ip_address, user_agent, author_user_id, is_admin_reply)
VALUES ($1,$2,$3,'','',$4,'approved','','',$5,true)
RETURNING id::text`,
		parent.PostID,
		parent.ID,
		strings.TrimSpace(authorName),
		strings.TrimSpace(content),
		nullableString(authorUserID),
	).Scan(&id)
	if err != nil {
		return models.Comment{}, err
	}
	return s.GetCommentByID(ctx, id)
}

func (s Store) CountRecentCommentsByIP(ctx context.Context, ip string, since time.Time) (int, error) {
	var total int
	err := s.pool.QueryRow(ctx, `
SELECT count(*)
FROM comments
WHERE ip_address=$1 AND created_at >= $2`, strings.TrimSpace(ip), since).Scan(&total)
	return total, err
}

func (s Store) DeleteComment(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM comments WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) ListComments(ctx context.Context, filter models.CommentFilter) ([]models.Comment, error) {
	filter = normalizeCommentFilter(filter)
	where, args := commentListWhere(filter)
	args = append(args, filter.Limit, filter.Offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
SELECT %s
FROM comments c
%s
WHERE %s
ORDER BY c.created_at DESC
LIMIT $%d OFFSET $%d`, commentSelectColumns, commentJoins, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanComments(rows)
}

func (s Store) CountComments(ctx context.Context, filter models.CommentFilter) (int, error) {
	where, args := commentListWhere(normalizeCommentFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT count(*)
FROM comments c
%s
WHERE %s`, commentJoins, where), args...).Scan(&total)
	return total, err
}

func (s Store) ListCommentsPage(ctx context.Context, filter models.CommentFilter) (models.PaginatedComments, error) {
	filter = normalizeCommentFilter(filter)
	total, err := s.CountComments(ctx, filter)
	if err != nil {
		return models.PaginatedComments{}, err
	}
	comments, err := s.ListComments(ctx, filter)
	if err != nil {
		return models.PaginatedComments{}, err
	}
	return models.PaginatedComments{
		Items:  comments,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func scanComments(rows pgx.Rows) ([]models.Comment, error) {
	comments := []models.Comment{}
	for rows.Next() {
		item, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, item)
	}
	return comments, rows.Err()
}

func scanComment(row rowScanner) (models.Comment, error) {
	var item models.Comment
	err := row.Scan(
		&item.ID,
		&item.PostID,
		&item.PostTitle,
		&item.PostSlug,
		&item.ParentID,
		&item.ParentAuthorName,
		&item.AuthorUserID,
		&item.IsAdminReply,
		&item.AuthorName,
		&item.Email,
		&item.Website,
		&item.Content,
		&item.Status,
		&item.IPAddress,
		&item.UserAgent,
		&item.CreatedAt,
	)
	return item, err
}

func (s Store) ListApprovedCommentsForPost(ctx context.Context, postID string) ([]models.Comment, error) {
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
SELECT %s
FROM comments c
%s
WHERE c.post_id=$1 AND c.status='approved' AND (c.parent_id IS NULL OR parent.status='approved') AND %s
ORDER BY COALESCE(parent.created_at, c.created_at) ASC, c.parent_id IS NOT NULL ASC, c.created_at ASC`, commentSelectColumns, commentJoins, publicPostRelationSQLCondition("p")), postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []models.Comment{}
	for rows.Next() {
		item, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, item)
	}
	return comments, rows.Err()
}

func (s Store) ModerateComment(ctx context.Context, id, status string) (models.Comment, error) {
	if status != "approved" && status != "pending" && status != "spam" {
		return models.Comment{}, errors.New("invalid comment status")
	}
	tag, err := s.pool.Exec(ctx, "UPDATE comments SET status=$1 WHERE id=$2", status, id)
	if err != nil {
		return models.Comment{}, err
	}
	if tag.RowsAffected() == 0 {
		return models.Comment{}, pgx.ErrNoRows
	}
	return s.GetCommentByID(ctx, id)
}

func (s Store) GetSettings(ctx context.Context) (map[string]any, error) {
	rows, err := s.pool.Query(ctx, "SELECT key, value::text FROM site_settings ORDER BY key")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := map[string]any{}
	for rows.Next() {
		var key string
		var raw string
		if err := rows.Scan(&key, &raw); err != nil {
			return nil, err
		}
		var value any
		if err := json.Unmarshal([]byte(raw), &value); err != nil {
			return nil, err
		}
		settings[key] = value
	}
	return settings, rows.Err()
}

func (s Store) UpdateSettings(ctx context.Context, settings map[string]any) (map[string]any, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	upserts, deletes := settingsMutations(settings)
	for _, key := range deletes {
		if _, err := tx.Exec(ctx, "DELETE FROM site_settings WHERE key=$1", key); err != nil {
			return nil, err
		}
	}
	for key, value := range upserts {
		raw, err := json.Marshal(value)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO site_settings (key, value)
VALUES ($1,$2::jsonb)
ON CONFLICT (key) DO UPDATE SET value=excluded.value`, key, string(raw)); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetSettings(ctx)
}

func settingsMutations(settings map[string]any) (map[string]any, []string) {
	upserts := map[string]any{}
	deletes := []string{}
	for key, value := range settings {
		if strings.TrimSpace(key) == "" {
			continue
		}
		if value == nil {
			deletes = append(deletes, key)
			continue
		}
		upserts[key] = value
	}
	sort.Strings(deletes)
	return upserts, deletes
}

func (s Store) uniqueSlug(ctx context.Context, table, base, ignoreID string) (string, error) {
	slug := base
	for i := 0; i < 50; i++ {
		candidate := slug
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", slug, i+1)
		}
		args := []any{candidate}
		query := fmt.Sprintf("SELECT EXISTS (SELECT 1 FROM %s WHERE slug=$1", table)
		if ignoreID != "" {
			args = append(args, ignoreID)
			query += " AND id<>$2"
		}
		query += ")"
		var exists bool
		if err := s.pool.QueryRow(ctx, query, args...).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", errors.New("cannot allocate unique slug")
}

func (s Store) attachPostRelations(ctx context.Context, post *models.Post) error {
	categories, err := s.postCategories(ctx, post.ID)
	if err != nil {
		return err
	}
	tags, err := s.postTags(ctx, post.ID)
	if err != nil {
		return err
	}
	post.Categories = categories
	post.Tags = tags
	return nil
}

func (s Store) postCategories(ctx context.Context, postID string) ([]models.Category, error) {
	rows, err := s.pool.Query(ctx, `
SELECT c.id::text, c.name, c.slug, c.description, c.sort_order, 0, c.created_at
FROM categories c
JOIN post_categories pc ON pc.category_id=c.id
WHERE pc.post_id=$1
ORDER BY c.sort_order ASC, c.name ASC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.Category{}
	for rows.Next() {
		var item models.Category
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.Description, &item.SortOrder, &item.PostCount, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s Store) postTags(ctx context.Context, postID string) ([]models.Tag, error) {
	rows, err := s.pool.Query(ctx, `
SELECT t.id::text, t.name, t.slug, 0, t.created_at
FROM tags t
JOIN post_tags pt ON pt.tag_id=t.id
WHERE pt.post_id=$1
ORDER BY t.name ASC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.Tag{}
	for rows.Next() {
		var item models.Tag
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.PostCount, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPost(row rowScanner) (models.Post, error) {
	var post models.Post
	var publishedAt sql.NullTime
	var deletedAt sql.NullTime
	err := row.Scan(
		&post.ID,
		&post.Title,
		&post.Slug,
		&post.Excerpt,
		&post.Content,
		&post.SourceLanguage,
		&post.CoverURL,
		&post.Status,
		&post.Featured,
		&post.SEOTitle,
		&post.SEODescription,
		&post.AuthorID,
		&post.AuthorName,
		&post.ViewCount,
		&post.CommentCount,
		&publishedAt,
		&post.CreatedAt,
		&post.UpdatedAt,
		&deletedAt,
	)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			return post, errors.New(pgErr.Message)
		}
		return post, err
	}
	if publishedAt.Valid {
		value := publishedAt.Time
		post.PublishedAt = &value
	}
	post.SourceLanguage = i18n.NormalizeLanguageCode(post.SourceLanguage)
	if deletedAt.Valid {
		value := deletedAt.Time
		post.DeletedAt = &value
	}
	return post, nil
}
