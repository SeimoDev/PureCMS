package store

import (
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizeCommentFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizeCommentFilter(models.CommentFilter{Limit: 500, Offset: -3})

	if got.Limit != maxCommentPageLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxCommentPageLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
}

func TestCommentListWhereIncludesStatusAndQuery(t *testing.T) {
	filter := models.CommentFilter{Status: "pending", Query: "作者"}

	where, args := commentListWhere(filter)

	for _, want := range []string{
		"c.status=$1",
		"c.author_name ILIKE $2",
		"c.email ILIKE $2",
		"c.website ILIKE $2",
		"c.content ILIKE $2",
		"p.title ILIKE $2",
		"p.slug ILIKE $2",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("commentListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 2 {
		t.Fatalf("len(args) = %d, want 2", len(args))
	}
}

func TestCommentListWhereSearchesReplyContext(t *testing.T) {
	where, _ := commentListWhere(models.CommentFilter{Query: "站长"})

	for _, want := range []string{
		"parent.author_name ILIKE $1",
		"parent.content ILIKE $1",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("commentListWhere() = %q, want reply fragment %q", where, want)
		}
	}
}
