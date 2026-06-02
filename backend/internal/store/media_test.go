package store

import (
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizeMediaAltTextTrimsWhitespace(t *testing.T) {
	got := NormalizeMediaAltText("  文章封面图  ")
	if got != "文章封面图" {
		t.Fatalf("NormalizeMediaAltText() = %q, want trimmed alt text", got)
	}
}

func TestNormalizeMediaAltTextLimitsRuneLength(t *testing.T) {
	got := NormalizeMediaAltText(strings.Repeat("图", 180))
	if len([]rune(got)) != maxMediaAltTextRunes {
		t.Fatalf("NormalizeMediaAltText rune length = %d, want %d", len([]rune(got)), maxMediaAltTextRunes)
	}
}

func TestNormalizeMediaAssetFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizeMediaAssetFilter(models.MediaAssetFilter{Limit: 500, Offset: -8, Kind: " IMAGE "})

	if got.Limit != maxMediaAssetPageLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxMediaAssetPageLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
	if got.Kind != "image" {
		t.Fatalf("Kind = %q, want normalized image", got.Kind)
	}
}

func TestMediaAssetListWhereIncludesKindAndQuery(t *testing.T) {
	filter := models.MediaAssetFilter{Kind: "image", Query: "封面"}

	where, args := mediaAssetListWhere(filter)

	for _, want := range []string{
		"mime_type LIKE 'image/%'",
		"filename ILIKE $1",
		"original_name ILIKE $1",
		"mime_type ILIKE $1",
		"alt_text ILIKE $1",
		"url ILIKE $1",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("mediaAssetListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 1 {
		t.Fatalf("len(args) = %d, want 1", len(args))
	}
}

func TestMediaAssetListWhereSupportsExactMimeType(t *testing.T) {
	filter := models.MediaAssetFilter{Kind: "image", MimeType: "application/pdf"}

	where, args := mediaAssetListWhere(filter)

	if !strings.Contains(where, "mime_type=$1") {
		t.Fatalf("mediaAssetListWhere() = %q, want exact mime filter", where)
	}
	if strings.Contains(where, "image/%") {
		t.Fatalf("mediaAssetListWhere() = %q, did not expect kind filter when exact mime is present", where)
	}
	if len(args) != 1 || args[0] != "application/pdf" {
		t.Fatalf("args = %#v, want exact mime arg", args)
	}
}

func TestMediaAssetReferencePatternsIncludeURLAndUploadPath(t *testing.T) {
	asset := models.MediaAsset{
		Filename: "2026/06/cover.png",
		URL:      "https://cdn.example.com/uploads/2026/06/cover.png",
	}

	got := mediaAssetReferencePatterns(asset)

	want := []string{
		"https://cdn.example.com/uploads/2026/06/cover.png",
		"/uploads/2026/06/cover.png",
	}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("mediaAssetReferencePatterns() = %#v, want %#v", got, want)
	}
}

func TestMediaAssetReferencePatternsDeduplicatesValues(t *testing.T) {
	asset := models.MediaAsset{
		Filename: "2026/06/cover.png",
		URL:      "/uploads/2026/06/cover.png",
	}

	got := mediaAssetReferencePatterns(asset)

	if len(got) != 1 || got[0] != "/uploads/2026/06/cover.png" {
		t.Fatalf("mediaAssetReferencePatterns() = %#v, want one upload path", got)
	}
}

func TestMediaAssetReferenceCountSQLUsesSinglePatternArray(t *testing.T) {
	got := mediaAssetReferenceCountSQL()

	for _, want := range []string{
		"unnest($1::text[])",
		"p.cover_url=pattern.value",
		"p.content ILIKE '%' || pattern.value || '%'",
		"pg.content ILIKE '%' || pattern.value || '%'",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("mediaAssetReferenceCountSQL() = %q, want fragment %q", got, want)
		}
	}
}

func TestDeleteMediaAssetSQLRejectsReferencedAssets(t *testing.T) {
	got := deleteMediaAssetSQL()

	for _, want := range []string{
		"WITH target AS",
		"DELETE FROM media_assets",
		"USING target t",
		"m.id=t.id",
		"NOT EXISTS",
		"FROM posts p, unnest(t.patterns)",
		"p.cover_url=pattern.value",
		"p.content ILIKE '%' || pattern.value || '%'",
		"FROM pages pg, unnest(t.patterns)",
		"pg.content ILIKE '%' || pattern.value || '%'",
		"RETURNING m.id::text",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("deleteMediaAssetSQL() = %q, want fragment %q", got, want)
		}
	}
}

func TestMediaAssetInUseErrorIsDescriptive(t *testing.T) {
	if (MediaAssetInUseError{}).Error() != "media asset is still referenced" {
		t.Fatalf("MediaAssetInUseError message = %q", (MediaAssetInUseError{}).Error())
	}
}
