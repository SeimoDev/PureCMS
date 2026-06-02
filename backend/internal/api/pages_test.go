package api

import (
	"net/http/httptest"
	"testing"
)

func TestAdminPageFilterFromQueryUsesPageOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/pages?page=3&limit=12&q=关于&status=published&nav=shown&deleted=1", nil)

	got := adminPageFilterFromQuery(req)

	if got.Limit != 12 {
		t.Fatalf("Limit = %d, want 12", got.Limit)
	}
	if got.Offset != 24 {
		t.Fatalf("Offset = %d, want page-derived offset 24", got.Offset)
	}
	if !got.Admin || !got.Deleted || got.Query != "关于" || got.Status != "published" || got.Nav != "shown" {
		t.Fatalf("filter = %+v, want admin/deleted/query/status/nav populated", got)
	}
}

func TestAdminPageFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/pages?page=3&limit=12&offset=5", nil)

	got := adminPageFilterFromQuery(req)

	if got.Offset != 5 {
		t.Fatalf("Offset = %d, want explicit offset 5", got.Offset)
	}
}

func TestWantsPaginatedPagesResponse(t *testing.T) {
	tests := []struct {
		target string
		want   bool
	}{
		{target: "/api/admin/pages", want: false},
		{target: "/api/admin/pages?paged=1", want: true},
		{target: "/api/admin/pages?page=2", want: true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.target, nil)
		if got := wantsPaginatedPagesResponse(req); got != tt.want {
			t.Fatalf("wantsPaginatedPagesResponse(%q) = %v, want %v", tt.target, got, tt.want)
		}
	}
}
