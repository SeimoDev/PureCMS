package store

import (
	"strings"
	"testing"
)

func TestDeletedContentSQLConditionDefaultsToActiveContent(t *testing.T) {
	got := deletedContentSQLCondition("p", false)
	want := "p.deleted_at IS NULL"
	if got != want {
		t.Fatalf("deletedContentSQLCondition() = %q, want %q", got, want)
	}
}

func TestDeletedContentSQLConditionCanSelectTrash(t *testing.T) {
	got := deletedContentSQLCondition("pages", true)
	want := "pages.deleted_at IS NOT NULL"
	if got != want {
		t.Fatalf("deletedContentSQLCondition() = %q, want %q", got, want)
	}
}

func TestPublicPostRelationSQLConditionExcludesTrashAndNonPublicPosts(t *testing.T) {
	got := publicPostRelationSQLCondition("p")
	for _, want := range []string{
		"p.deleted_at IS NULL",
		"p.status='published'",
		"p.published_at IS NULL OR p.published_at <= now()",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("publicPostRelationSQLCondition() = %q, want fragment %q", got, want)
		}
	}
}
