package api

import (
	"context"
	"encoding/xml"
	"net/http"
	"net/url"
	"strings"
	"time"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

type rssDocument struct {
	XMLName xml.Name   `xml:"rss"`
	Version string     `xml:"version,attr"`
	Channel rssChannel `xml:"channel"`
}

type rssChannel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Language    string    `xml:"language"`
	UpdatedAt   string    `xml:"lastBuildDate"`
	Items       []rssItem `xml:"item"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	GUID        string `xml:"guid"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
}

type sitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

type sitemapURL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod,omitempty"`
	ChangeFreq string `xml:"changefreq,omitempty"`
	Priority   string `xml:"priority,omitempty"`
}

const rssPostLimit = 50
const sitemapPostBatchSize = 50

type sitemapPostLister func(context.Context, models.PostFilter) ([]models.Post, error)

func (s Server) robots(w http.ResponseWriter, r *http.Request) {
	settings, _ := s.store.GetSettings(r.Context())
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(buildRobotsTXT(s.cfg.FrontendURL, publicMaintenanceEnabled(settings))))
}

func (s Server) rss(w http.ResponseWriter, r *http.Request) {
	posts, err := s.store.ListPosts(r.Context(), rssPostFilter())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "生成 RSS 失败")
		return
	}
	settings, _ := s.store.GetSettings(r.Context())
	writeXML(w, buildRSSDocument(s.cfg.FrontendURL, settings, posts, time.Now()))
}

func rssPostFilter() models.PostFilter {
	return models.PostFilter{Admin: false, Limit: rssPostLimit}
}

func buildRSSDocument(baseURL string, settings map[string]any, posts []models.Post, updatedAt time.Time) rssDocument {
	site := nestedMap(settings, "site")
	seo := nestedMap(settings, "seo")
	baseURL = strings.TrimRight(baseURL, "/")
	doc := rssDocument{
		Version: "2.0",
		Channel: rssChannel{
			Title:       stringSetting(site, "title", "个人博客"),
			Link:        baseURL,
			Description: stringSetting(seo, "description", stringSetting(site, "subtitle", "个人博客 RSS")),
			Language:    "zh-CN",
			UpdatedAt:   updatedAt.Format(time.RFC1123Z),
			Items:       make([]rssItem, 0, len(posts)),
		},
	}
	for _, post := range posts {
		publishedAt := post.CreatedAt
		if post.PublishedAt != nil {
			publishedAt = *post.PublishedAt
		}
		link := baseURL + "/posts/" + post.Slug
		doc.Channel.Items = append(doc.Channel.Items, rssItem{
			Title:       post.Title,
			Link:        link,
			GUID:        link,
			Description: firstNonEmpty(post.Excerpt, post.SEODescription),
			PubDate:     publishedAt.Format(time.RFC1123Z),
		})
	}
	return doc
}

func (s Server) sitemap(w http.ResponseWriter, r *http.Request) {
	posts, err := listAllSitemapPosts(r.Context(), s.store.ListPosts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "生成 sitemap 失败")
		return
	}
	pages, err := s.store.ListPages(r.Context(), sitemapPageFilter())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "生成 sitemap 失败")
		return
	}
	categories, err := s.store.ListCategories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "生成 sitemap 失败")
		return
	}
	tags, err := s.store.ListTags(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "生成 sitemap 失败")
		return
	}
	baseURL := strings.TrimRight(s.cfg.FrontendURL, "/")
	doc := sitemapURLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  buildSitemapURLs(baseURL, posts, pages, categories, tags),
	}
	writeXML(w, doc)
}

func listAllSitemapPosts(ctx context.Context, listPosts sitemapPostLister) ([]models.Post, error) {
	posts := []models.Post{}
	for offset := 0; ; offset += sitemapPostBatchSize {
		batch, err := listPosts(ctx, models.PostFilter{Admin: false, Limit: sitemapPostBatchSize, Offset: offset})
		if err != nil {
			return nil, err
		}
		posts = append(posts, batch...)
		if len(batch) < sitemapPostBatchSize {
			return posts, nil
		}
	}
}

func sitemapPageFilter() models.PageFilter {
	return models.PageFilter{Admin: true, Status: "published"}
}

func buildSitemapURLs(baseURL string, posts []models.Post, pages []models.Page, categories []models.Category, tags []models.Tag) []sitemapURL {
	urls := []sitemapURL{
		{Loc: baseURL + "/", ChangeFreq: "daily", Priority: "1.0"},
		{Loc: baseURL + "/archives", ChangeFreq: "weekly", Priority: "0.7"},
		{Loc: baseURL + "/links", ChangeFreq: "weekly", Priority: "0.6"},
	}
	for _, category := range categories {
		if category.PostCount <= 0 {
			continue
		}
		urls = append(urls, sitemapURL{
			Loc:        baseURL + "/categories/" + category.Slug,
			ChangeFreq: "weekly",
			Priority:   "0.6",
		})
	}
	for _, tag := range tags {
		if tag.PostCount <= 0 {
			continue
		}
		urls = append(urls, sitemapURL{
			Loc:        baseURL + "/tags/" + tag.Slug,
			ChangeFreq: "weekly",
			Priority:   "0.5",
		})
	}
	for _, post := range posts {
		urls = append(urls, sitemapPostLanguageURLs(baseURL, post)...)
	}
	for _, page := range pages {
		urls = append(urls, sitemapURL{
			Loc:        baseURL + "/pages/" + page.Slug,
			LastMod:    page.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "monthly",
			Priority:   "0.6",
		})
	}
	return urls
}

func sitemapPostLanguageURLs(baseURL string, post models.Post) []sitemapURL {
	baseLoc := baseURL + "/posts/" + post.Slug
	lastMod := post.UpdatedAt.Format("2006-01-02")
	urls := make([]sitemapURL, 0, len(i18n.SupportedLanguages))
	for _, language := range i18n.SupportedLanguages {
		code := i18n.NormalizeLanguageCode(language.Code)
		loc := baseLoc
		if code != i18n.DefaultLanguageCode {
			loc = baseLoc + "?lang=" + url.QueryEscape(code)
		}
		urls = append(urls, sitemapURL{
			Loc:        loc,
			LastMod:    lastMod,
			ChangeFreq: "weekly",
			Priority:   "0.8",
		})
	}
	return urls
}

func buildRobotsTXT(baseURL string, maintenance bool) string {
	if maintenance {
		return strings.Join([]string{
			"User-agent: *",
			"Disallow: /",
			"",
		}, "\n")
	}
	base := strings.TrimRight(baseURL, "/")
	if base == "" {
		base = "/"
	}
	return strings.Join([]string{
		"User-agent: *",
		"Allow: /",
		"Disallow: /admin",
		"Disallow: /login",
		"Disallow: /api/admin",
		"Sitemap: " + strings.TrimRight(base, "/") + "/sitemap.xml",
		"",
	}, "\n")
}

func writeXML(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(xml.Header))
	_ = xml.NewEncoder(w).Encode(payload)
}

func nestedMap(settings map[string]any, key string) map[string]any {
	if settings == nil {
		return nil
	}
	if value, ok := settings[key].(map[string]any); ok {
		return value
	}
	return nil
}

func stringSetting(values map[string]any, key, fallback string) string {
	if values == nil {
		return fallback
	}
	if value, ok := values[key].(string); ok && strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
