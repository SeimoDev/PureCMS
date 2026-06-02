package store

import (
	"context"
	"time"

	"purecms/backend/internal/models"
)

func (s Store) DatabaseStatus(ctx context.Context) models.SystemDatabaseStatus {
	start := time.Now()
	status := models.SystemDatabaseStatus{Status: "ok"}
	if s.pool == nil {
		status.Status = "error"
		status.LatencyMs = time.Since(start).Milliseconds()
		return status
	}
	var probe int
	if err := s.pool.QueryRow(ctx, "SELECT 1").Scan(&probe); err != nil || probe != 1 {
		status.Status = "error"
	}
	status.LatencyMs = time.Since(start).Milliseconds()
	stats := s.pool.Stat()
	status.TotalConns = stats.TotalConns()
	status.AcquiredConns = stats.AcquiredConns()
	status.IdleConns = stats.IdleConns()
	return status
}

func (s Store) SystemContentStats(ctx context.Context) (models.SystemContentStats, error) {
	var stats models.SystemContentStats
	err := s.pool.QueryRow(ctx, systemContentStatsSQL()).Scan(
		&stats.Posts,
		&stats.TrashedPosts,
		&stats.Pages,
		&stats.TrashedPages,
		&stats.MediaAssets,
		&stats.Comments,
		&stats.Users,
		&stats.ActivityLogs,
		&stats.TranslationCaches,
		&stats.StaleTranslationCaches,
		&stats.TranslationJobs,
		&stats.RunningTranslationJobs,
		&stats.FailedTranslationJobs,
	)
	return stats, err
}

func systemContentStatsSQL() string {
	staleSQL := "pt.source_hash <> " + currentPostSourceHashSQL("p")
	return `
SELECT
  (SELECT count(*) FROM posts WHERE deleted_at IS NULL),
  (SELECT count(*) FROM posts WHERE deleted_at IS NOT NULL),
  (SELECT count(*) FROM pages WHERE deleted_at IS NULL),
  (SELECT count(*) FROM pages WHERE deleted_at IS NOT NULL),
  (SELECT count(*) FROM media_assets),
  (SELECT count(*) FROM comments),
  (SELECT count(*) FROM users),
  (SELECT count(*) FROM activity_logs),
  (SELECT count(*) FROM post_translations),
  (SELECT count(*) FROM post_translations pt JOIN posts p ON p.id=pt.post_id WHERE ` + staleSQL + `),
  (SELECT count(*) FROM post_translation_jobs),
  (SELECT count(*) FROM post_translation_jobs WHERE status='running'),
  (SELECT count(*) FROM post_translation_jobs WHERE status='failed')
`
}
