package api

import (
	"net/http/httptest"
	"testing"
	"time"

	"purecms/backend/internal/models"
)

func TestCommentFilterFromQueryUsesPageOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/comments?page=3&limit=15&status=pending&q=张三", nil)

	got := commentFilterFromQuery(req)

	if got.Limit != 15 {
		t.Fatalf("Limit = %d, want 15", got.Limit)
	}
	if got.Offset != 30 {
		t.Fatalf("Offset = %d, want page-derived offset 30", got.Offset)
	}
	if got.Status != "pending" || got.Query != "张三" {
		t.Fatalf("filter = %+v, want status and query populated", got)
	}
}

func TestCommentFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/comments?page=3&limit=15&offset=8", nil)

	got := commentFilterFromQuery(req)

	if got.Offset != 8 {
		t.Fatalf("Offset = %d, want explicit offset 8", got.Offset)
	}
}

func TestWantsPaginatedCommentsResponse(t *testing.T) {
	tests := []struct {
		target string
		want   bool
	}{
		{target: "/api/admin/comments", want: false},
		{target: "/api/admin/comments?paged=1", want: true},
		{target: "/api/admin/comments?page=2", want: true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.target, nil)
		if got := wantsPaginatedCommentsResponse(req); got != tt.want {
			t.Fatalf("wantsPaginatedCommentsResponse(%q) = %v, want %v", tt.target, got, tt.want)
		}
	}
}

func TestCommentInputSupportsReplyParent(t *testing.T) {
	input := models.CommentInput{
		AuthorName: "李四",
		Content:    "回复一下",
		ParentID:   "comment-1",
	}

	if input.ParentID != "comment-1" {
		t.Fatalf("ParentID = %q, want comment-1", input.ParentID)
	}
}

func TestPublicCommentResponseRedactsPrivateFields(t *testing.T) {
	input := models.Comment{
		ID:               "comment-1",
		PostID:           "post-1",
		PostTitle:        "文章",
		PostSlug:         "hello",
		ParentID:         "parent-1",
		ParentAuthorName: "王五",
		AuthorUserID:     "admin-user-1",
		IsAdminReply:     true,
		AuthorName:       "李四",
		Email:            "reader@example.com",
		Website:          "https://reader.example.com",
		Content:          "评论内容",
		Status:           "approved",
		IPAddress:        "203.0.113.5",
		UserAgent:        "Browser/1.0",
	}

	got := publicCommentResponse(input)

	if got.Email != "" || got.IPAddress != "" || got.UserAgent != "" || got.AuthorUserID != "" {
		t.Fatalf("public comment exposed private fields: %+v", got)
	}
	if got.Website != input.Website || got.AuthorName != input.AuthorName || got.Content != input.Content || got.IsAdminReply != input.IsAdminReply {
		t.Fatalf("public comment lost public fields: %+v", got)
	}
	if input.Email == "" || input.IPAddress == "" || input.UserAgent == "" || input.AuthorUserID == "" {
		t.Fatalf("publicCommentResponse mutated source comment: %+v", input)
	}
}

func TestPublicCommentsResponseRedactsEveryItem(t *testing.T) {
	input := []models.Comment{
		{ID: "comment-1", Email: "one@example.com", IPAddress: "203.0.113.1", UserAgent: "Browser/1", AuthorUserID: "admin-1"},
		{ID: "comment-2", Email: "two@example.com", IPAddress: "203.0.113.2", UserAgent: "Browser/2", AuthorUserID: "admin-2"},
	}

	got := publicCommentsResponse(input)

	if len(got) != 2 {
		t.Fatalf("len(publicCommentsResponse) = %d, want 2", len(got))
	}
	for _, comment := range got {
		if comment.Email != "" || comment.IPAddress != "" || comment.UserAgent != "" || comment.AuthorUserID != "" {
			t.Fatalf("public comment exposed private fields: %+v", comment)
		}
	}
	if input[0].Email == "" || input[1].IPAddress == "" {
		t.Fatalf("publicCommentsResponse mutated source comments: %+v", input)
	}
}

func TestCommentPolicyFromSettingsUsesDefaults(t *testing.T) {
	got := commentPolicyFromSettings(map[string]any{})

	if !got.Enabled {
		t.Fatal("Enabled = false, want true by default")
	}
	if !got.Moderation {
		t.Fatal("Moderation = false, want true by default")
	}
	if len(got.SpamKeywords) != 0 {
		t.Fatalf("SpamKeywords = %+v, want empty default", got.SpamKeywords)
	}
	if got.RateLimitWindow != 10*time.Minute {
		t.Fatalf("RateLimitWindow = %s, want 10m", got.RateLimitWindow)
	}
	if got.RateLimitMax != 5 {
		t.Fatalf("RateLimitMax = %d, want 5", got.RateLimitMax)
	}
}

func TestCommentPolicyFromSettingsReadsCommentOptions(t *testing.T) {
	got := commentPolicyFromSettings(map[string]any{
		"comment": map[string]any{
			"enabled":                false,
			"moderation":             false,
			"spamKeywords":           []any{"推广", "  外链  ", 12},
			"rateLimitWindowMinutes": 3.0,
			"rateLimitMax":           2.0,
		},
	})

	if got.Enabled {
		t.Fatal("Enabled = true, want false from settings")
	}
	if got.Moderation {
		t.Fatal("Moderation = true, want false from settings")
	}
	if got.RateLimitWindow != 3*time.Minute {
		t.Fatalf("RateLimitWindow = %s, want 3m", got.RateLimitWindow)
	}
	if got.RateLimitMax != 2 {
		t.Fatalf("RateLimitMax = %d, want 2", got.RateLimitMax)
	}
	if len(got.SpamKeywords) != 2 || got.SpamKeywords[0] != "推广" || got.SpamKeywords[1] != "外链" {
		t.Fatalf("SpamKeywords = %+v, want trimmed string keywords only", got.SpamKeywords)
	}
}

func TestCommentPolicyFromSettingsClampsRateLimit(t *testing.T) {
	got := commentPolicyFromSettings(map[string]any{
		"comment": map[string]any{
			"rateLimitWindowMinutes": 9000.0,
			"rateLimitMax":           2000.0,
		},
	})

	if got.RateLimitWindow != 24*time.Hour {
		t.Fatalf("RateLimitWindow = %s, want 24h cap", got.RateLimitWindow)
	}
	if got.RateLimitMax != 100 {
		t.Fatalf("RateLimitMax = %d, want 100 cap", got.RateLimitMax)
	}
}
