package api

import (
	"net/http/httptest"
	"testing"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

func TestActivityLogFilterFromQueryUsesPageOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/activity-logs?page=4&limit=25&q=admin&action=update&entityType=post", nil)

	got := activityLogFilterFromQuery(req)

	if got.Limit != 25 {
		t.Fatalf("Limit = %d, want 25", got.Limit)
	}
	if got.Offset != 75 {
		t.Fatalf("Offset = %d, want page-derived offset 75", got.Offset)
	}
	if got.Query != "admin" || got.Action != "update" || got.EntityType != "post" {
		t.Fatalf("filter = %+v, want query/action/entityType populated", got)
	}
}

func TestActivityLogFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/activity-logs?page=4&limit=25&offset=9", nil)

	got := activityLogFilterFromQuery(req)

	if got.Offset != 9 {
		t.Fatalf("Offset = %d, want explicit offset 9", got.Offset)
	}
}

func TestWantsPaginatedActivityLogsResponse(t *testing.T) {
	tests := []struct {
		target string
		want   bool
	}{
		{target: "/api/admin/activity-logs", want: false},
		{target: "/api/admin/activity-logs?paged=1", want: true},
		{target: "/api/admin/activity-logs?page=2", want: true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.target, nil)
		if got := wantsPaginatedActivityLogsResponse(req); got != tt.want {
			t.Fatalf("wantsPaginatedActivityLogsResponse(%q) = %v, want %v", tt.target, got, tt.want)
		}
	}
}

func TestActivityLogRetentionDaysFromQueryDefaultsAndClamps(t *testing.T) {
	tests := []struct {
		target string
		want   int
	}{
		{target: "/api/admin/activity-logs/retention", want: defaultActivityLogRetentionDays},
		{target: "/api/admin/activity-logs/retention?days=3", want: minActivityLogRetentionDays},
		{target: "/api/admin/activity-logs/retention?days=99999", want: maxActivityLogRetentionDays},
		{target: "/api/admin/activity-logs/retention?days=90", want: 90},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("DELETE", tt.target, nil)
		if got := activityLogRetentionDaysFromQuery(req); got != tt.want {
			t.Fatalf("activityLogRetentionDaysFromQuery(%q) = %d, want %d", tt.target, got, tt.want)
		}
	}
}

func TestRevisionRestoreLogDetailIncludesVersion(t *testing.T) {
	got := revisionRestoreLogDetail("Publish flow", "revision-7")

	if got["title"] != "Publish flow" || got["version"] != "revision-7" {
		t.Fatalf("revisionRestoreLogDetail = %+v, want title and version", got)
	}
}

func TestPostRevisionRestoreLogDetailIncludesPublishTimeTranslationPlan(t *testing.T) {
	got := postRevisionRestoreLogDetail(models.Post{
		Title:          "restored post",
		Status:         "published",
		SourceLanguage: "en",
	}, "revision-8")

	if got["version"] != "revision-8" || got["translationMode"] != "publish-time" {
		t.Fatalf("postRevisionRestoreLogDetail = %+v, want version and publish-time translation", got)
	}
	if got["translationTargetCount"] != len(i18n.SupportedLanguages)-1 {
		t.Fatalf("translationTargetCount = %v, want all non-source languages", got["translationTargetCount"])
	}
}
