package api

import (
	"context"
	"strings"
	"testing"
	"time"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

func TestBuildSitemapURLsIncludesPostsAndPages(t *testing.T) {
	updatedAt := time.Date(2026, 6, 1, 8, 30, 0, 0, time.UTC)

	urls := buildSitemapURLs("https://example.com", []models.Post{
		{Slug: "hello-cms", UpdatedAt: updatedAt},
	}, []models.Page{
		{Slug: "about", UpdatedAt: updatedAt},
	}, []models.Category{
		{Slug: "tech-notes", PostCount: 12},
		{Slug: "empty", PostCount: 0},
	}, []models.Tag{
		{Slug: "go", PostCount: 5},
		{Slug: "draft-only", PostCount: 0},
	})

	if len(urls) != 17 {
		t.Fatalf("len(urls) = %d, want 17", len(urls))
	}
	assertSitemapURL(t, urls[0], "https://example.com/", "daily", "1.0")
	assertSitemapURL(t, urls[1], "https://example.com/archives", "weekly", "0.7")
	assertSitemapURL(t, urls[2], "https://example.com/links", "weekly", "0.6")
	assertSitemapURL(t, urls[3], "https://example.com/categories/tech-notes", "weekly", "0.6")
	assertSitemapURL(t, urls[4], "https://example.com/tags/go", "weekly", "0.5")
	assertSitemapURL(t, urls[5], "https://example.com/posts/hello-cms", "weekly", "0.8")
	assertSitemapURL(t, urls[7], "https://example.com/posts/hello-cms?lang=en", "weekly", "0.8")
	assertSitemapURL(t, urls[16], "https://example.com/pages/about", "monthly", "0.6")
	if urls[16].LastMod != "2026-06-01" {
		t.Fatalf("page LastMod = %q, want 2026-06-01", urls[16].LastMod)
	}
}

func TestSitemapPostLanguageURLsIncludeEverySupportedLanguage(t *testing.T) {
	updatedAt := time.Date(2026, 6, 1, 8, 30, 0, 0, time.UTC)

	urls := sitemapPostLanguageURLs("https://example.com", models.Post{Slug: "hello-cms", UpdatedAt: updatedAt})

	if len(urls) != len(i18n.SupportedLanguages) {
		t.Fatalf("len(urls) = %d, want every supported language", len(urls))
	}
	assertSitemapURL(t, urls[0], "https://example.com/posts/hello-cms", "weekly", "0.8")
	if urls[0].LastMod != "2026-06-01" {
		t.Fatalf("default language LastMod = %q, want 2026-06-01", urls[0].LastMod)
	}
	wantLanguages := map[string]bool{}
	for _, language := range i18n.SupportedLanguages {
		wantLanguages[i18n.NormalizeLanguageCode(language.Code)] = true
	}
	delete(wantLanguages, i18n.DefaultLanguageCode)
	for _, item := range urls[1:] {
		_, rawLanguage, ok := strings.Cut(item.Loc, "?lang=")
		if !ok {
			t.Fatalf("localized sitemap URL missing lang query: %+v", item)
		}
		delete(wantLanguages, rawLanguage)
	}
	if len(wantLanguages) > 0 {
		t.Fatalf("localized sitemap URLs missing languages: %v", wantLanguages)
	}
}

func TestBuildRobotsTXTAdvertisesSitemap(t *testing.T) {
	got := buildRobotsTXT("https://example.com/blog/", false)
	want := "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /api/admin\nSitemap: https://example.com/blog/sitemap.xml\n"

	if got != want {
		t.Fatalf("robots.txt = %q, want %q", got, want)
	}
}

func TestBuildRobotsTXTDisallowsAllDuringMaintenance(t *testing.T) {
	got := buildRobotsTXT("https://example.com/blog/", true)
	want := "User-agent: *\nDisallow: /\n"

	if got != want {
		t.Fatalf("maintenance robots.txt = %q, want %q", got, want)
	}
	if strings.Contains(got, "Sitemap:") {
		t.Fatalf("maintenance robots.txt should not advertise sitemap: %q", got)
	}
}

func TestBuildRSSDocumentUsesPublicPostMetadata(t *testing.T) {
	publishedAt := time.Date(2026, 6, 1, 8, 30, 0, 0, time.UTC)
	createdAt := time.Date(2026, 5, 31, 8, 30, 0, 0, time.UTC)
	updatedAt := time.Date(2026, 6, 2, 8, 30, 0, 0, time.UTC)

	doc := buildRSSDocument("https://example.com/blog/", map[string]any{
		"site": map[string]any{
			"title":    "Tea Journal",
			"subtitle": "Personal notes",
		},
		"seo": map[string]any{
			"description": "Long-form writing about software",
		},
	}, []models.Post{
		{
			Title:          "Material Design CMS",
			Slug:           "md3-cms",
			Excerpt:        "Release notes",
			SEODescription: "SEO fallback",
			CreatedAt:      createdAt,
			UpdatedAt:      updatedAt,
			PublishedAt:    &publishedAt,
		},
		{
			Title:          "Drafting workflow",
			Slug:           "drafting-workflow",
			SEODescription: "Uses SEO description when excerpt is empty",
			CreatedAt:      createdAt,
			UpdatedAt:      updatedAt,
		},
	}, updatedAt)

	if doc.Version != "2.0" {
		t.Fatalf("rss version = %q, want 2.0", doc.Version)
	}
	if doc.Channel.Title != "Tea Journal" || doc.Channel.Link != "https://example.com/blog" {
		t.Fatalf("channel identity = %+v", doc.Channel)
	}
	if doc.Channel.Description != "Long-form writing about software" {
		t.Fatalf("channel description = %q", doc.Channel.Description)
	}
	if doc.Channel.UpdatedAt != updatedAt.Format(time.RFC1123Z) {
		t.Fatalf("lastBuildDate = %q", doc.Channel.UpdatedAt)
	}
	if len(doc.Channel.Items) != 2 {
		t.Fatalf("len(items) = %d, want 2", len(doc.Channel.Items))
	}
	first := doc.Channel.Items[0]
	if first.Link != "https://example.com/blog/posts/md3-cms" || first.GUID != first.Link {
		t.Fatalf("first item link/guid = %+v", first)
	}
	if first.Description != "Release notes" || first.PubDate != publishedAt.Format(time.RFC1123Z) {
		t.Fatalf("first item metadata = %+v", first)
	}
	second := doc.Channel.Items[1]
	if second.Description != "Uses SEO description when excerpt is empty" || second.PubDate != createdAt.Format(time.RFC1123Z) {
		t.Fatalf("second item fallback metadata = %+v", second)
	}
}

func TestRSSPostFilterUsesPublicLatestLimit(t *testing.T) {
	got := rssPostFilter()

	if got.Admin {
		t.Fatalf("rssPostFilter Admin = true, want public-only feed")
	}
	if rssPostLimit != 50 {
		t.Fatalf("rssPostLimit = %d, want 50", rssPostLimit)
	}
	if got.Limit != rssPostLimit {
		t.Fatalf("rssPostFilter Limit = %d, want latest 50", got.Limit)
	}
	if got.Offset != 0 || got.Status != "" || got.Deleted || got.Scheduled {
		t.Fatalf("rssPostFilter = %+v, want first public page without admin-only filters", got)
	}
}

func TestListAllSitemapPostsFetchesEveryPublicBatch(t *testing.T) {
	calls := []models.PostFilter{}
	posts, err := listAllSitemapPosts(context.Background(), func(ctx context.Context, filter models.PostFilter) ([]models.Post, error) {
		calls = append(calls, filter)
		switch filter.Offset {
		case 0:
			return makeSitemapPosts(50, "first"), nil
		case 50:
			return makeSitemapPosts(50, "second"), nil
		case 100:
			return makeSitemapPosts(3, "last"), nil
		default:
			t.Fatalf("unexpected sitemap post offset %d", filter.Offset)
			return nil, nil
		}
	})
	if err != nil {
		t.Fatalf("listAllSitemapPosts returned error: %v", err)
	}
	if len(posts) != 103 {
		t.Fatalf("len(posts) = %d, want 103", len(posts))
	}
	if len(calls) != 3 {
		t.Fatalf("len(calls) = %d, want 3", len(calls))
	}
	for index, call := range calls {
		if call.Admin || call.Limit != sitemapPostBatchSize || call.Offset != index*sitemapPostBatchSize {
			t.Fatalf("call[%d] = %+v, want public batch offset %d", index, call, index*sitemapPostBatchSize)
		}
	}
}

func TestSitemapPageFilterIncludesPublishedHiddenPages(t *testing.T) {
	got := sitemapPageFilter()
	if !got.Admin || got.Status != "published" || got.Nav != "" || got.Deleted || got.IncludeDeleted {
		t.Fatalf("sitemapPageFilter = %+v, want published non-deleted pages regardless of nav visibility", got)
	}
}

func assertSitemapURL(t *testing.T, got sitemapURL, loc, changeFreq, priority string) {
	t.Helper()
	if got.Loc != loc {
		t.Fatalf("Loc = %q, want %q", got.Loc, loc)
	}
	if got.ChangeFreq != changeFreq {
		t.Fatalf("ChangeFreq = %q, want %q", got.ChangeFreq, changeFreq)
	}
	if got.Priority != priority {
		t.Fatalf("Priority = %q, want %q", got.Priority, priority)
	}
}

func makeSitemapPosts(count int, prefix string) []models.Post {
	posts := make([]models.Post, count)
	for index := range posts {
		posts[index] = models.Post{Slug: prefix}
	}
	return posts
}
