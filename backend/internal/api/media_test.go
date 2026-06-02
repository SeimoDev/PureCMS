package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMediaAssetFilterFromQueryUsesPageOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/media?page=3&limit=24&q=封面&kind=image&mimeType=image/png", nil)

	got := mediaAssetFilterFromQuery(req)

	if got.Limit != 24 {
		t.Fatalf("Limit = %d, want 24", got.Limit)
	}
	if got.Offset != 48 {
		t.Fatalf("Offset = %d, want page-derived offset 48", got.Offset)
	}
	if got.Query != "封面" || got.Kind != "image" || got.MimeType != "image/png" {
		t.Fatalf("filter = %+v, want query/kind/mimeType populated", got)
	}
}

func TestMediaAssetFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/media?page=3&limit=24&offset=8", nil)

	got := mediaAssetFilterFromQuery(req)

	if got.Offset != 8 {
		t.Fatalf("Offset = %d, want explicit offset 8", got.Offset)
	}
}

func TestWantsPaginatedMediaResponse(t *testing.T) {
	tests := []struct {
		target string
		want   bool
	}{
		{target: "/api/admin/media", want: false},
		{target: "/api/admin/media?paged=1", want: true},
		{target: "/api/admin/media?page=2", want: true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.target, nil)
		if got := wantsPaginatedMediaResponse(req); got != tt.want {
			t.Fatalf("wantsPaginatedMediaResponse(%q) = %v, want %v", tt.target, got, tt.want)
		}
	}
}

func TestAllowedMediaTypeUsesSafeWhitelist(t *testing.T) {
	tests := []struct {
		value string
		want  bool
	}{
		{value: "image/png", want: true},
		{value: "image/jpeg; charset=binary", want: true},
		{value: "image/svg+xml", want: false},
		{value: "application/pdf", want: true},
		{value: "text/plain; charset=utf-8", want: true},
		{value: "text/html", want: false},
	}

	for _, tt := range tests {
		if got := allowedMediaType(tt.value); got != tt.want {
			t.Fatalf("allowedMediaType(%q) = %v, want %v", tt.value, got, tt.want)
		}
	}
}

func TestValidateUploadMediaTypeRejectsDisguisedHTML(t *testing.T) {
	if got, ok := validateUploadMediaType("image/png", "text/html; charset=utf-8"); ok || got != "" {
		t.Fatalf("validateUploadMediaType accepted disguised upload: got %q ok=%v", got, ok)
	}
}

func TestDetectUploadMediaTypeSniffsAndRewinds(t *testing.T) {
	content := "\x89PNG\r\n\x1a\n" + strings.Repeat("\x00", 64)
	reader := strings.NewReader(content)

	got, err := detectUploadMediaType(reader, "image/png")
	if err != nil {
		t.Fatalf("detectUploadMediaType returned error: %v", err)
	}
	if got != "image/png" {
		t.Fatalf("detectUploadMediaType = %q, want image/png", got)
	}
	first, err := reader.ReadByte()
	if err != nil {
		t.Fatalf("reader was not rewound: %v", err)
	}
	if first != 0x89 {
		t.Fatalf("first byte after detect = %#x, want PNG signature", first)
	}
}

func TestMediaAssetInUseErrorUsesConflictStatus(t *testing.T) {
	rec := httptest.NewRecorder()

	writeMediaAssetInUseError(rec)

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "媒体仍被内容引用") {
		t.Fatalf("body = %q, want media in-use message", rec.Body.String())
	}
}

func TestTaxonomyInUseErrorUsesConflictStatus(t *testing.T) {
	rec := httptest.NewRecorder()

	writeTaxonomyInUseError(rec, "分类", 2)

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "分类仍被 2 篇内容引用") {
		t.Fatalf("body = %q, want taxonomy in-use message", rec.Body.String())
	}
}
