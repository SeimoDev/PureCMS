package store

import (
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizeTranslationCacheFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizeTranslationCacheFilter(models.TranslationCacheFilter{
		Limit:          500,
		Offset:         -6,
		LanguageCode:   " EN-us ",
		SourceLanguage: " zh_hant ",
	})

	if got.Limit != maxTranslationCachePageLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxTranslationCachePageLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
	if got.LanguageCode != "en" || got.SourceLanguage != "zh-TW" {
		t.Fatalf("languages = %q/%q, want en/zh-TW", got.LanguageCode, got.SourceLanguage)
	}
}

func TestTranslationCacheListWhereIncludesLanguageAndQueryFilters(t *testing.T) {
	where, args := translationCacheListWhere(models.TranslationCacheFilter{
		Query:          "cms",
		LanguageCode:   "en",
		SourceLanguage: "zh-CN",
	})

	for _, want := range []string{
		"tc.language_code=$1",
		"tc.source_language=$2",
		"p.title ILIKE $3",
		"p.slug ILIKE $3",
		"COALESCE(pt.title, '') ILIKE $3",
		"tc.source_hash ILIKE $3",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("translationCacheListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 3 {
		t.Fatalf("len(args) = %d, want 3", len(args))
	}
}

func TestPostTranslationJobStatusDefaultsAndErrorsAreBounded(t *testing.T) {
	if got := normalizePostTranslationJobStatus("succeeded"); got != "succeeded" {
		t.Fatalf("status = %q, want succeeded", got)
	}
	if got := normalizePostTranslationJobStatus("failed"); got != "failed" {
		t.Fatalf("status = %q, want failed", got)
	}
	if got := normalizePostTranslationJobStatus("queued"); got != "running" {
		t.Fatalf("status = %q, want running", got)
	}

	long := strings.Repeat("错", 1200)
	if got := []rune(truncateTranslationJobError(long)); len(got) != 1000 {
		t.Fatalf("truncated runes = %d, want 1000", len(got))
	}
}

func TestCurrentPostSourceHashSQLUsesSameFieldsAsGoHash(t *testing.T) {
	got := currentPostSourceHashSQL("p")

	for _, want := range []string{
		"digest(",
		"p.source_language",
		"btrim(p.title)",
		"btrim(p.excerpt)",
		"p.content",
		"decode('00', 'hex')",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("currentPostSourceHashSQL() = %q, want fragment %q", got, want)
		}
	}
}
