package store

import (
	"strings"
	"testing"
	"time"

	"purecms/backend/internal/models"
)

func TestNormalizeActivityLogFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizeActivityLogFilter(models.ActivityLogFilter{Limit: 500, Offset: -8})

	if got.Limit != maxActivityLogPageLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxActivityLogPageLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
}

func TestActivityLogListWhereIncludesFilters(t *testing.T) {
	filter := models.ActivityLogFilter{
		Query:      "admin",
		Action:     "update",
		EntityType: "post",
	}

	where, args := activityLogListWhere(filter)

	for _, want := range []string{
		"action=$1",
		"entity_type=$2",
		"actor_username ILIKE $3",
		"entity_id ILIKE $3",
		"ip_address ILIKE $3",
		"user_agent ILIKE $3",
		"detail::text ILIKE $3",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("activityLogListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 3 {
		t.Fatalf("len(args) = %d, want 3", len(args))
	}
}

func TestDeleteActivityLogsBeforeSQLUsesCutoff(t *testing.T) {
	query := deleteActivityLogsBeforeSQL()

	for _, want := range []string{
		"DELETE FROM activity_logs",
		"created_at < $1",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("deleteActivityLogsBeforeSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestActivityLogRetentionCutoffUsesWholeDays(t *testing.T) {
	now := time.Date(2026, 6, 2, 10, 30, 0, 0, time.UTC)
	got := ActivityLogRetentionCutoff(now, 30)
	want := time.Date(2026, 5, 3, 10, 30, 0, 0, time.UTC)

	if !got.Equal(want) {
		t.Fatalf("ActivityLogRetentionCutoff() = %s, want %s", got, want)
	}
}
