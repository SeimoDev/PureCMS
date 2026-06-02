package database

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestLookupIndexMigrationCoversHotCMSQueries(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "migrations", "016_lookup_indexes.sql"))
	if err != nil {
		t.Fatalf("read lookup index migration: %v", err)
	}
	sql := string(raw)

	for _, want := range []string{
		"CREATE INDEX IF NOT EXISTS idx_comments_post_status_created",
		"ON comments(post_id, status, created_at ASC)",
		"CREATE INDEX IF NOT EXISTS idx_post_categories_category_post",
		"ON post_categories(category_id, post_id)",
		"CREATE INDEX IF NOT EXISTS idx_post_tags_tag_post",
		"ON post_tags(tag_id, post_id)",
	} {
		if !strings.Contains(sql, want) {
			t.Fatalf("016_lookup_indexes.sql missing %q:\n%s", want, sql)
		}
	}
}

func TestTranslationJobsMigrationTracksPublishTimeTranslationState(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "migrations", "017_translation_jobs.sql"))
	if err != nil {
		t.Fatalf("read translation jobs migration: %v", err)
	}
	sql := string(raw)

	for _, want := range []string{
		"CREATE TABLE IF NOT EXISTS post_translation_jobs",
		"status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed'))",
		"error_message text NOT NULL DEFAULT ''",
		"UNIQUE (post_id, language_code, source_hash)",
		"CREATE INDEX IF NOT EXISTS idx_post_translation_jobs_status_updated",
	} {
		if !strings.Contains(sql, want) {
			t.Fatalf("017_translation_jobs.sql missing %q:\n%s", want, sql)
		}
	}
}

func TestRunMigrationsUsesSessionAdvisoryLock(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate database test file")
	}
	raw, err := os.ReadFile(filepath.Join(filepath.Dir(file), "database.go"))
	if err != nil {
		t.Fatalf("read database.go: %v", err)
	}
	source := string(raw)

	for _, want := range []string{
		"pool.Acquire(ctx)",
		"acquireMigrationLock(ctx, conn)",
		"releaseMigrationLock(context.Background(), conn)",
		"SELECT pg_advisory_lock($1)",
		"SELECT pg_advisory_unlock($1)",
		"conn.BeginTx(ctx",
	} {
		if !strings.Contains(source, want) {
			t.Fatalf("RunMigrations should hold a session advisory lock while applying migrations; missing %q", want)
		}
	}
	if migrationAdvisoryLockID == 0 {
		t.Fatal("migration advisory lock id must be non-zero")
	}
}
