package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestBackupUserSerializesPasswordHashButUserDoesNot(t *testing.T) {
	backupRaw, err := json.Marshal(BackupUser{Username: "editor", PasswordHash: "hash-value"})
	if err != nil {
		t.Fatalf("json.Marshal(BackupUser) returned error: %v", err)
	}
	if !strings.Contains(string(backupRaw), `"passwordHash":"hash-value"`) {
		t.Fatalf("BackupUser JSON = %s, want passwordHash included", backupRaw)
	}

	userRaw, err := json.Marshal(User{Username: "editor", PasswordHash: "hash-value"})
	if err != nil {
		t.Fatalf("json.Marshal(User) returned error: %v", err)
	}
	if strings.Contains(string(userRaw), "passwordHash") || strings.Contains(string(userRaw), "hash-value") {
		t.Fatalf("User JSON = %s, did not expect password hash leakage", userRaw)
	}
}

func TestBackupImportResultIncludesAdminMechanismCounts(t *testing.T) {
	result := BackupImportResult{Users: 2, PageRevisions: 4, PostTranslations: 5, PostTranslationJobs: 6, ActivityLogs: 3}

	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("json.Marshal(BackupImportResult) returned error: %v", err)
	}
	for _, want := range []string{`"users":2`, `"pageRevisions":4`, `"postTranslations":5`, `"postTranslationJobs":6`, `"activityLogs":3`} {
		if !strings.Contains(string(raw), want) {
			t.Fatalf("BackupImportResult JSON = %s, want %s", raw, want)
		}
	}
}

func TestDashboardStatsIncludesScheduledPosts(t *testing.T) {
	raw, err := json.Marshal(DashboardStats{ScheduledPosts: 2, FeaturedPosts: 3})
	if err != nil {
		t.Fatalf("json.Marshal(DashboardStats) returned error: %v", err)
	}
	if !strings.Contains(string(raw), `"scheduledPosts":2`) {
		t.Fatalf("DashboardStats JSON = %s, want scheduledPosts", raw)
	}
	if !strings.Contains(string(raw), `"featuredPosts":3`) {
		t.Fatalf("DashboardStats JSON = %s, want featuredPosts", raw)
	}
}

func TestBackupSnapshotIncludesRevisionsAndTranslations(t *testing.T) {
	snapshot := BackupSnapshot{
		PageRevisions: []PageRevision{{VersionNumber: 2, Title: "关于我"}},
		PostTranslations: []PostTranslation{{
			PostID:       "post-1",
			LanguageCode: "en",
			Segments:     []PostTranslationSegment{{Index: 0, SourceText: "你好", TranslatedText: "Hello"}},
		}},
		PostTranslationJobs: []PostTranslationJob{{
			PostID:       "post-1",
			LanguageCode: "ja",
			Status:       "failed",
			ErrorMessage: "timeout",
		}},
	}

	raw, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatalf("json.Marshal(BackupSnapshot) returned error: %v", err)
	}
	for _, want := range []string{`"pageRevisions"`, `"postTranslations"`, `"translatedText":"Hello"`, `"postTranslationJobs"`, `"errorMessage":"timeout"`} {
		if !strings.Contains(string(raw), want) {
			t.Fatalf("BackupSnapshot JSON = %s, want %s included", raw, want)
		}
	}
}

func TestMediaAssetOmitsEmptyBackupContent(t *testing.T) {
	raw, err := json.Marshal(MediaAsset{Filename: "2026/06/asset.txt"})
	if err != nil {
		t.Fatalf("json.Marshal(MediaAsset) returned error: %v", err)
	}
	if strings.Contains(string(raw), "contentBase64") {
		t.Fatalf("MediaAsset JSON = %s, did not expect empty contentBase64", raw)
	}
}

func TestMediaAssetSerializesBackupContentWhenPresent(t *testing.T) {
	raw, err := json.Marshal(MediaAsset{Filename: "2026/06/asset.txt", ContentBase64: "Ym9keQ=="})
	if err != nil {
		t.Fatalf("json.Marshal(MediaAsset) returned error: %v", err)
	}
	if !strings.Contains(string(raw), `"contentBase64":"Ym9keQ=="`) {
		t.Fatalf("MediaAsset JSON = %s, want contentBase64", raw)
	}
}

func TestCommentSerializesThreadAndAdminReplyFields(t *testing.T) {
	comment := Comment{
		ID:               "comment-2",
		ParentID:         "comment-1",
		ParentAuthorName: "张三",
		AuthorUserID:     "user-1",
		IsAdminReply:     true,
	}

	raw, err := json.Marshal(comment)
	if err != nil {
		t.Fatalf("json.Marshal(Comment) returned error: %v", err)
	}
	for _, want := range []string{
		`"parentId":"comment-1"`,
		`"parentAuthorName":"张三"`,
		`"authorUserId":"user-1"`,
		`"isAdminReply":true`,
	} {
		if !strings.Contains(string(raw), want) {
			t.Fatalf("Comment JSON = %s, want %s", raw, want)
		}
	}
}
