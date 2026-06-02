package store

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (s Store) ImportBackupSnapshot(ctx context.Context, snapshot models.BackupSnapshot) (models.BackupImportResult, error) {
	var result models.BackupImportResult
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)

	for key, value := range snapshot.Settings {
		raw, err := json.Marshal(value)
		if err != nil {
			return result, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO site_settings (key, value)
VALUES ($1,$2::jsonb)
ON CONFLICT (key) DO UPDATE SET value=excluded.value`, key, string(raw)); err != nil {
			return result, err
		}
		result.Settings++
	}

	userMap := map[string]string{}
	for _, user := range snapshot.Users {
		username := strings.TrimSpace(user.Username)
		if username == "" {
			continue
		}
		displayName := strings.TrimSpace(user.DisplayName)
		if displayName == "" {
			displayName = username
		}
		passwordHash := strings.TrimSpace(user.PasswordHash)
		var id string
		if passwordHash == "" {
			err := tx.QueryRow(ctx, `
SELECT id::text
FROM users
WHERE username=$1`, username).Scan(&id)
			if err == pgx.ErrNoRows {
				continue
			}
			if err != nil {
				return result, err
			}
			if _, err := tx.Exec(ctx, `
UPDATE users
SET display_name=$1, role=$2, status=$3, token_version=GREATEST(token_version, $4), last_login_at=$5
WHERE id=$6`,
				displayName,
				normalizeRole(user.Role),
				normalizeUserStatus(user.Status),
				user.TokenVersion,
				user.LastLoginAt,
				id,
			); err != nil {
				return result, err
			}
		} else if err := tx.QueryRow(ctx, `
INSERT INTO users (username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
ON CONFLICT (username) DO UPDATE SET
  display_name=excluded.display_name,
  password_hash=excluded.password_hash,
  role=excluded.role,
  status=excluded.status,
  token_version=GREATEST(users.token_version, excluded.token_version),
  last_login_at=excluded.last_login_at
RETURNING id::text`,
			username,
			displayName,
			passwordHash,
			normalizeRole(user.Role),
			normalizeUserStatus(user.Status),
			user.TokenVersion,
			user.LastLoginAt,
			user.CreatedAt,
			user.UpdatedAt,
		).Scan(&id); err != nil {
			return result, err
		}
		if user.ID != "" {
			userMap[user.ID] = id
		}
		userMap["username:"+username] = id
		result.Users++
	}
	if _, err := tx.Exec(ctx, `
UPDATE users
SET role='admin', status='active'
WHERE id=(SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM users WHERE role='admin' AND status='active')`); err != nil {
		return result, err
	}

	categoryMap := map[string]string{}
	for _, category := range snapshot.Categories {
		var id string
		if err := tx.QueryRow(ctx, `
INSERT INTO categories (name, slug, description, sort_order)
VALUES ($1,$2,$3,$4)
ON CONFLICT (slug) DO UPDATE SET name=excluded.name, description=excluded.description, sort_order=excluded.sort_order
RETURNING id::text`, category.Name, category.Slug, category.Description, category.SortOrder).Scan(&id); err != nil {
			return result, err
		}
		categoryMap[category.ID] = id
		result.Categories++
	}

	tagMap := map[string]string{}
	for _, tag := range snapshot.Tags {
		var id string
		if err := tx.QueryRow(ctx, `
INSERT INTO tags (name, slug)
VALUES ($1,$2)
ON CONFLICT (slug) DO UPDATE SET name=excluded.name
RETURNING id::text`, tag.Name, tag.Slug).Scan(&id); err != nil {
			return result, err
		}
		tagMap[tag.ID] = id
		result.Tags++
	}

	postMap := map[string]string{}
	for _, post := range snapshot.Posts {
		var id string
		if err := tx.QueryRow(ctx, `
INSERT INTO posts (title, slug, excerpt, content, source_language, cover_url, status, featured, seo_title, seo_description, author_id, view_count, published_at, created_at, updated_at, deleted_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
ON CONFLICT (slug) DO UPDATE SET
  title=excluded.title,
  excerpt=excluded.excerpt,
  content=excluded.content,
  source_language=excluded.source_language,
  cover_url=excluded.cover_url,
  status=excluded.status,
  featured=excluded.featured,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  author_id=excluded.author_id,
  view_count=excluded.view_count,
  published_at=excluded.published_at,
  deleted_at=excluded.deleted_at
RETURNING id::text`,
			post.Title, post.Slug, post.Excerpt, post.Content, i18n.NormalizeLanguageCode(post.SourceLanguage), post.CoverURL, post.Status, post.Featured,
			post.SEOTitle, post.SEODescription, nullableString(remapID(post.AuthorID, userMap)), post.ViewCount,
			post.PublishedAt, post.CreatedAt, post.UpdatedAt, post.DeletedAt,
		).Scan(&id); err != nil {
			return result, err
		}
		postMap[post.ID] = id
		if _, err := tx.Exec(ctx, "DELETE FROM post_categories WHERE post_id=$1", id); err != nil {
			return result, err
		}
		for _, category := range post.Categories {
			if categoryID := categoryMap[category.ID]; categoryID != "" {
				if _, err := tx.Exec(ctx, "INSERT INTO post_categories (post_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", id, categoryID); err != nil {
					return result, err
				}
			}
		}
		if _, err := tx.Exec(ctx, "DELETE FROM post_tags WHERE post_id=$1", id); err != nil {
			return result, err
		}
		for _, tag := range post.Tags {
			if tagID := tagMap[tag.ID]; tagID != "" {
				if _, err := tx.Exec(ctx, "INSERT INTO post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", id, tagID); err != nil {
					return result, err
				}
			}
		}
		result.Posts++
	}

	pageMap := map[string]string{}
	for _, page := range snapshot.Pages {
		var id string
		if err := tx.QueryRow(ctx, `
INSERT INTO pages (title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description, created_at, updated_at, deleted_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
ON CONFLICT (slug) DO UPDATE SET
  title=excluded.title,
  content=excluded.content,
  status=excluded.status,
  show_in_nav=excluded.show_in_nav,
  nav_label=excluded.nav_label,
  sort_order=excluded.sort_order,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  deleted_at=excluded.deleted_at
RETURNING id::text`,
			page.Title, page.Slug, page.Content, page.Status, page.ShowInNav, page.NavLabel, page.SortOrder,
			page.SEOTitle, page.SEODescription, page.CreatedAt, page.UpdatedAt, page.DeletedAt,
		).Scan(&id); err != nil {
			return result, err
		}
		pageMap[page.ID] = id
		result.Pages++
	}

	importedComments := map[string]bool{}
	pendingCommentParents := map[string]string{}
	for _, comment := range snapshot.Comments {
		postID := postMap[comment.PostID]
		if postID == "" || strings.TrimSpace(comment.ID) == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO comments (id, post_id, parent_id, author_name, email, website, content, status, ip_address, user_agent, author_user_id, is_admin_reply, created_at)
VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
ON CONFLICT (id) DO UPDATE SET
  post_id=excluded.post_id,
  parent_id=excluded.parent_id,
  author_name=excluded.author_name,
  email=excluded.email,
  website=excluded.website,
  content=excluded.content,
  status=excluded.status,
  ip_address=excluded.ip_address,
  user_agent=excluded.user_agent,
  author_user_id=excluded.author_user_id,
  is_admin_reply=excluded.is_admin_reply,
  created_at=excluded.created_at`,
			comment.ID, postID, comment.AuthorName, comment.Email, comment.Website, comment.Content, comment.Status,
			comment.IPAddress, comment.UserAgent, nullableString(remapID(comment.AuthorUserID, userMap)), comment.IsAdminReply, comment.CreatedAt,
		); err != nil {
			return result, err
		}
		importedComments[comment.ID] = true
		if strings.TrimSpace(comment.ParentID) != "" {
			pendingCommentParents[comment.ID] = strings.TrimSpace(comment.ParentID)
		}
		result.Comments++
	}
	for id, parentID := range pendingCommentParents {
		if !importedComments[parentID] {
			continue
		}
		if _, err := tx.Exec(ctx, `
UPDATE comments
SET parent_id=$1
WHERE id=$2`, parentID, id); err != nil {
			return result, err
		}
	}

	for _, asset := range snapshot.MediaAssets {
		if _, err := tx.Exec(ctx, `
INSERT INTO media_assets (filename, original_name, mime_type, size_bytes, url, alt_text, uploaded_by, created_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
ON CONFLICT (filename) DO UPDATE SET
  original_name=excluded.original_name,
  mime_type=excluded.mime_type,
  size_bytes=excluded.size_bytes,
  url=excluded.url,
  alt_text=excluded.alt_text,
  uploaded_by=excluded.uploaded_by`,
			asset.Filename, asset.OriginalName, asset.MimeType, asset.SizeBytes, asset.URL, asset.AltText,
			nullableString(remapID(asset.UploadedBy, userMap)), asset.CreatedAt,
		); err != nil {
			return result, err
		}
		result.MediaAssets++
	}

	for _, revision := range snapshot.PostRevisions {
		postID := postMap[revision.PostID]
		if postID == "" {
			continue
		}
		categoryIDs := remapIDs(revision.CategoryIDs, categoryMap)
		tagIDs := remapIDs(revision.TagIDs, tagMap)
		if _, err := tx.Exec(ctx, `
INSERT INTO post_revisions (
  post_id, version_number, title, slug, excerpt, content, source_language, cover_url, status, featured,
  seo_title, seo_description, category_ids, tag_ids, published_at, created_by, created_at
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
ON CONFLICT (post_id, version_number) DO UPDATE SET
  title=excluded.title,
  slug=excluded.slug,
  excerpt=excluded.excerpt,
  content=excluded.content,
  source_language=excluded.source_language,
  cover_url=excluded.cover_url,
  status=excluded.status,
  featured=excluded.featured,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  category_ids=excluded.category_ids,
  tag_ids=excluded.tag_ids,
  published_at=excluded.published_at,
  created_by=excluded.created_by`,
			postID, revision.VersionNumber, revision.Title, revision.Slug, revision.Excerpt, revision.Content,
			i18n.NormalizeLanguageCode(revision.SourceLanguage), revision.CoverURL, revision.Status, revision.Featured, revision.SEOTitle, revision.SEODescription,
			categoryIDs, tagIDs, revision.PublishedAt, nullableString(remapID(revision.CreatedBy, userMap)), revision.CreatedAt,
		); err != nil {
			return result, err
		}
		result.PostRevisions++
	}

	for _, revision := range snapshot.PageRevisions {
		pageID := pageMap[revision.PageID]
		if pageID == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO page_revisions (
  page_id, version_number, title, slug, content, status, show_in_nav, nav_label,
  sort_order, seo_title, seo_description, created_by, created_at
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
ON CONFLICT (page_id, version_number) DO UPDATE SET
  title=excluded.title,
  slug=excluded.slug,
  content=excluded.content,
  status=excluded.status,
  show_in_nav=excluded.show_in_nav,
  nav_label=excluded.nav_label,
  sort_order=excluded.sort_order,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  created_by=excluded.created_by`,
			pageID, revision.VersionNumber, revision.Title, revision.Slug, revision.Content, revision.Status,
			revision.ShowInNav, revision.NavLabel, revision.SortOrder, revision.SEOTitle, revision.SEODescription,
			nullableString(remapID(revision.CreatedBy, userMap)), revision.CreatedAt,
		); err != nil {
			return result, err
		}
		result.PageRevisions++
	}

	for _, translation := range snapshot.PostTranslations {
		postID := postMap[translation.PostID]
		if postID == "" {
			continue
		}
		rawSegments, err := json.Marshal(translation.Segments)
		if err != nil {
			return result, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO post_translations (post_id, language_code, source_language, source_hash, title, excerpt, content, segments, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
ON CONFLICT (post_id, language_code, source_hash) DO UPDATE SET
  source_language=excluded.source_language,
  title=excluded.title,
  excerpt=excluded.excerpt,
  content=excluded.content,
  segments=excluded.segments,
  updated_at=excluded.updated_at`,
			postID,
			i18n.NormalizeLanguageCode(translation.LanguageCode),
			i18n.NormalizeLanguageCode(translation.SourceLanguage),
			strings.TrimSpace(translation.SourceHash),
			translation.Title,
			translation.Excerpt,
			translation.Content,
			string(rawSegments),
			translation.CreatedAt,
			translation.UpdatedAt,
		); err != nil {
			return result, err
		}
		result.PostTranslations++
	}

	for _, job := range snapshot.PostTranslationJobs {
		postID := postMap[job.PostID]
		if postID == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO post_translation_jobs (
  post_id, language_code, source_language, source_hash, status, error_message,
  started_at, finished_at, created_at, updated_at
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, now()),COALESCE($10, now()))
ON CONFLICT (post_id, language_code, source_hash) DO UPDATE SET
  source_language=excluded.source_language,
  status=excluded.status,
  error_message=excluded.error_message,
  started_at=excluded.started_at,
  finished_at=excluded.finished_at,
  updated_at=excluded.updated_at`,
			postID,
			i18n.NormalizeLanguageCode(job.LanguageCode),
			i18n.NormalizeLanguageCode(job.SourceLanguage),
			strings.TrimSpace(job.SourceHash),
			normalizePostTranslationJobStatus(job.Status),
			truncateTranslationJobError(job.ErrorMessage),
			job.StartedAt,
			job.FinishedAt,
			nullableTime(job.CreatedAt),
			nullableTime(job.UpdatedAt),
		); err != nil {
			return result, err
		}
		result.PostTranslationJobs++
	}

	for _, stat := range snapshot.ViewStats {
		postID := postMap[stat.PostID]
		if postID == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO post_view_stats (day, post_id, views)
VALUES ($1,$2,$3)
ON CONFLICT (day, post_id) DO UPDATE SET views=excluded.views`, stat.Day, postID, stat.Views); err != nil {
			return result, err
		}
		result.ViewStats++
	}

	for _, link := range snapshot.FriendLinks {
		if _, err := tx.Exec(ctx, `
INSERT INTO friend_links (name, url, description, logo_url, status, sort_order, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
ON CONFLICT (url) DO UPDATE SET
  name=excluded.name,
  description=excluded.description,
  logo_url=excluded.logo_url,
  status=excluded.status,
  sort_order=excluded.sort_order`,
			link.Name, link.URL, link.Description, link.LogoURL, link.Status, link.SortOrder, link.CreatedAt, link.UpdatedAt,
		); err != nil {
			return result, err
		}
		result.FriendLinks++
	}

	for _, log := range snapshot.ActivityLogs {
		if log.Detail == nil {
			log.Detail = map[string]any{}
		}
		raw, err := json.Marshal(log.Detail)
		if err != nil {
			return result, err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO activity_logs (id, actor_id, actor_username, action, entity_type, entity_id, detail, ip_address, user_agent, created_at)
VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
ON CONFLICT (id) DO UPDATE SET
  actor_id=excluded.actor_id,
  actor_username=excluded.actor_username,
  action=excluded.action,
  entity_type=excluded.entity_type,
  entity_id=excluded.entity_id,
  detail=excluded.detail,
  ip_address=excluded.ip_address,
  user_agent=excluded.user_agent,
  created_at=excluded.created_at`,
			log.ID,
			nullableString(remapID(log.ActorID, userMap)),
			log.ActorUsername,
			log.Action,
			log.EntityType,
			log.EntityID,
			string(raw),
			log.IPAddress,
			log.UserAgent,
			log.CreatedAt,
		); err != nil {
			return result, err
		}
		result.ActivityLogs++
	}

	return result, tx.Commit(ctx)
}

func remapID(id string, mapping map[string]string) string {
	if value := mapping[id]; value != "" {
		return value
	}
	return ""
}

func remapIDs(ids []string, mapping map[string]string) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if value := mapping[id]; value != "" {
			out = append(out, value)
		}
	}
	return out
}

func nullableTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}
