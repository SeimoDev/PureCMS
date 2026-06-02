package store

import (
	"context"
	"database/sql"
	"time"

	"purecms/backend/internal/models"
)

func (s Store) ListAllPosts(ctx context.Context) ([]models.Post, error) {
	rows, err := s.pool.Query(ctx, `
SELECT
  p.id::text, p.title, p.slug, p.excerpt, p.content, p.source_language, p.cover_url, p.status, p.featured,
  p.seo_title, p.seo_description, COALESCE(p.author_id::text, ''), COALESCE(u.display_name, ''),
  p.view_count,
  (SELECT count(*) FROM comments c WHERE c.post_id=p.id AND c.status='approved') AS comment_count,
  p.published_at, p.created_at, p.updated_at, p.deleted_at
FROM posts p
LEFT JOIN users u ON u.id=p.author_id
ORDER BY COALESCE(p.published_at, p.created_at) DESC`)
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

func (s Store) ListAllComments(ctx context.Context) ([]models.Comment, error) {
	rows, err := s.pool.Query(ctx, `
SELECT `+commentSelectColumns+`
FROM comments c
`+commentJoins+`
ORDER BY c.created_at DESC`)
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

func (s Store) ListBackupUsers(ctx context.Context) ([]models.BackupUser, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at
FROM users
ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.BackupUser{}
	for rows.Next() {
		var user models.BackupUser
		var lastLoginAt sql.NullTime
		if err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.DisplayName,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&user.TokenVersion,
			&lastLoginAt,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if lastLoginAt.Valid {
			value := lastLoginAt.Time
			user.LastLoginAt = &value
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s Store) ListAllActivityLogs(ctx context.Context) ([]models.ActivityLog, error) {
	rows, err := s.pool.Query(ctx, `
SELECT id::text, COALESCE(actor_id::text, ''), actor_username, action, entity_type, entity_id, detail::text, ip_address, user_agent, created_at
FROM activity_logs
ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanActivityLogs(rows)
}

func (s Store) BuildBackupSnapshot(ctx context.Context) (models.BackupSnapshot, error) {
	var snapshot models.BackupSnapshot
	var err error
	snapshot.ExportedAt = time.Now()
	if snapshot.Settings, err = s.GetSettings(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.Users, err = s.ListBackupUsers(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.Posts, err = s.ListAllPosts(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.Pages, err = s.ListPages(ctx, models.PageFilter{Admin: true, IncludeDeleted: true}); err != nil {
		return snapshot, err
	}
	if snapshot.Categories, err = s.ListCategories(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.Tags, err = s.ListTags(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.Comments, err = s.ListAllComments(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.MediaAssets, err = s.ListMediaAssets(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.ActivityLogs, err = s.ListAllActivityLogs(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.PostRevisions, err = s.ListAllPostRevisions(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.PageRevisions, err = s.ListAllPageRevisions(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.PostTranslations, err = s.ListAllPostTranslations(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.PostTranslationJobs, err = s.ListAllPostTranslationJobs(ctx); err != nil {
		return snapshot, err
	}
	if snapshot.FriendLinks, err = s.ListFriendLinks(ctx, true); err != nil {
		return snapshot, err
	}
	if snapshot.ViewStats, err = s.ListPostViewStats(ctx); err != nil {
		return snapshot, err
	}
	return snapshot, nil
}
