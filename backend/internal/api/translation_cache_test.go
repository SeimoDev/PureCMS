package api

import (
	"net/http/httptest"
	"testing"
)

func TestTranslationCacheFilterFromQueryUsesPageOffsetAndLanguages(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/translations?page=3&limit=15&q=cms&lang=en-US&source=zh-Hant", nil)

	got := translationCacheFilterFromQuery(req)

	if got.Limit != 15 {
		t.Fatalf("Limit = %d, want 15", got.Limit)
	}
	if got.Offset != 30 {
		t.Fatalf("Offset = %d, want page-derived offset 30", got.Offset)
	}
	if got.Query != "cms" || got.LanguageCode != "en" || got.SourceLanguage != "zh-TW" {
		t.Fatalf("filter = %+v, want query and normalized languages", got)
	}
}

func TestTranslationCacheFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/translations?page=3&limit=15&offset=7", nil)

	got := translationCacheFilterFromQuery(req)

	if got.Offset != 7 {
		t.Fatalf("Offset = %d, want explicit offset 7", got.Offset)
	}
}
