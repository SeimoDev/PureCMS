package store

import (
	"context"
	"strings"
	"testing"
)

func TestSystemContentStatsSQLIncludesOperationalTables(t *testing.T) {
	query := systemContentStatsSQL()

	for _, want := range []string{
		"FROM posts WHERE deleted_at IS NULL",
		"FROM posts WHERE deleted_at IS NOT NULL",
		"FROM pages WHERE deleted_at IS NULL",
		"FROM pages WHERE deleted_at IS NOT NULL",
		"FROM media_assets",
		"FROM comments",
		"FROM users",
		"FROM activity_logs",
		"FROM post_translations",
		"FROM post_translation_jobs",
		"FROM post_translation_jobs WHERE status='running'",
		"FROM post_translation_jobs WHERE status='failed'",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("systemContentStatsSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestSystemContentStatsSQLCountsStaleTranslations(t *testing.T) {
	query := systemContentStatsSQL()

	for _, want := range []string{
		"pt.source_hash <>",
		"encode(digest(",
		"convert_to(",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("systemContentStatsSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestDatabaseStatusHandlesMissingPool(t *testing.T) {
	got := (Store{}).DatabaseStatus(context.Background())

	if got.Status != "error" {
		t.Fatalf("Status = %q, want error", got.Status)
	}
}
