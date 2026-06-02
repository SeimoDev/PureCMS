package store

import (
	"strings"
	"testing"
)

func TestDashboardStatsSQLCountsScheduledPosts(t *testing.T) {
	query := dashboardStatsSQL()

	for _, want := range []string{
		"status='published'",
		"published_at > now()",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("dashboardStatsSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestDashboardStatsSQLCountsFeaturedPosts(t *testing.T) {
	query := dashboardStatsSQL()

	for _, want := range []string{
		"featured=true",
		"deleted_at IS NULL",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("dashboardStatsSQL() = %q, want fragment %q", query, want)
		}
	}
}
