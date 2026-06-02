package store

import (
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizePostFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizePostFilter(models.PostFilter{Limit: 500, Offset: -4})

	if got.Limit != maxPostPageLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxPostPageLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
}

func TestPostListWhereUsesSameFiltersForCountAndList(t *testing.T) {
	filter := models.PostFilter{
		Query:    "cms",
		Status:   "published",
		Category: "tech",
		Tag:      "go",
		Admin:    true,
		Deleted:  true,
	}

	where, args := postListWhere(filter)

	for _, want := range []string{
		"p.deleted_at IS NOT NULL",
		"p.status=$1",
		"p.title ILIKE $2",
		"p.slug ILIKE $2",
		"p.seo_title ILIKE $2",
		"p.seo_description ILIKE $2",
		"search_c.name ILIKE $2",
		"search_t.name ILIKE $2",
		"search_u.display_name ILIKE $2",
		"c.slug=$3",
		"t.slug=$4",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("postListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 4 {
		t.Fatalf("len(args) = %d, want 4", len(args))
	}
}

func TestPostListWhereSupportsScheduledAdminFilter(t *testing.T) {
	filter := models.PostFilter{
		Admin:     true,
		Scheduled: true,
	}

	where, args := postListWhere(filter)

	for _, want := range []string{
		"p.deleted_at IS NULL",
		"p.status='published'",
		"p.published_at > now()",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("postListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 0 {
		t.Fatalf("len(args) = %d, want 0", len(args))
	}
}

func TestPostListWhereSupportsFeaturedAdminFilter(t *testing.T) {
	featured := true
	filter := models.PostFilter{
		Admin:    true,
		Featured: &featured,
	}

	where, args := postListWhere(filter)

	for _, want := range []string{
		"p.deleted_at IS NULL",
		"p.featured=$1",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("postListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 1 || args[0] != true {
		t.Fatalf("args = %#v, want [true]", args)
	}
}

func TestPostListWhereSupportsUnfeaturedAdminFilter(t *testing.T) {
	featured := false
	filter := models.PostFilter{
		Admin:    true,
		Featured: &featured,
	}

	where, args := postListWhere(filter)

	if !strings.Contains(where, "p.featured=$1") {
		t.Fatalf("postListWhere() = %q, want featured condition", where)
	}
	if len(args) != 1 || args[0] != false {
		t.Fatalf("args = %#v, want [false]", args)
	}
}
