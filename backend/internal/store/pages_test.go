package store

import (
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizePageInputBuildsSlugAndDefaultsStatus(t *testing.T) {
	got, err := NormalizePageInput(models.PageInput{
		Title:          " 关于我 ",
		Slug:           "",
		Content:        " 页面内容 ",
		SEODescription: " 简介 ",
	})
	if err != nil {
		t.Fatalf("NormalizePageInput returned error: %v", err)
	}
	if got.Title != "关于我" {
		t.Fatalf("Title = %q, want trimmed title", got.Title)
	}
	if got.Slug != "关于我" {
		t.Fatalf("Slug = %q, want slug from Chinese title", got.Slug)
	}
	if got.Content != "页面内容" {
		t.Fatalf("Content = %q, want trimmed content", got.Content)
	}
	if got.SEODescription != "简介" {
		t.Fatalf("SEODescription = %q, want trimmed SEO description", got.SEODescription)
	}
	if got.Status != "draft" {
		t.Fatalf("Status = %q, want draft", got.Status)
	}
}

func TestNormalizePageInputPreservesPublishedAndNavigation(t *testing.T) {
	got, err := NormalizePageInput(models.PageInput{
		Title:     "About",
		Slug:      "about-me",
		Status:    "published",
		ShowInNav: true,
		NavLabel:  " 关于 ",
		SortOrder: 20,
		Content:   "ok",
		SEOTitle:  " SEO ",
	})
	if err != nil {
		t.Fatalf("NormalizePageInput returned error: %v", err)
	}
	if got.Status != "published" {
		t.Fatalf("Status = %q, want published", got.Status)
	}
	if !got.ShowInNav {
		t.Fatal("ShowInNav = false, want true")
	}
	if got.NavLabel != "关于" {
		t.Fatalf("NavLabel = %q, want trimmed label", got.NavLabel)
	}
	if got.SortOrder != 20 {
		t.Fatalf("SortOrder = %d, want 20", got.SortOrder)
	}
	if got.SEOTitle != "SEO" {
		t.Fatalf("SEOTitle = %q, want trimmed SEO title", got.SEOTitle)
	}
}

func TestNormalizePageInputRejectsBlankTitle(t *testing.T) {
	_, err := NormalizePageInput(models.PageInput{Title: " ", Content: "content"})
	if err == nil {
		t.Fatal("NormalizePageInput returned nil error for blank title")
	}
}

func TestNormalizePageFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizePageFilter(models.PageFilter{Limit: 500, Offset: -7, Status: " PUBLISHED ", Nav: " SHOWN "})

	if got.Limit != maxPageListLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxPageListLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
	if got.Status != "published" || got.Nav != "shown" {
		t.Fatalf("filter = %+v, want normalized status/nav", got)
	}
}

func TestPageListWhereIncludesAdminFilters(t *testing.T) {
	filter := models.PageFilter{
		Admin:  true,
		Query:  "关于",
		Status: "published",
		Nav:    "shown",
	}

	where, args := pageListWhere(filter)

	for _, want := range []string{
		"deleted_at IS NULL",
		"status=$1",
		"show_in_nav=true",
		"title ILIKE $2",
		"slug ILIKE $2",
		"content ILIKE $2",
		"nav_label ILIKE $2",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("pageListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 2 {
		t.Fatalf("len(args) = %d, want 2", len(args))
	}
}
