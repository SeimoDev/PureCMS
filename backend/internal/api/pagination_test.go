package api

import (
	"net/http/httptest"
	"testing"
)

func TestPostFilterFromQueryUsesPageOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/posts?page=3&limit=12", nil)

	got := postFilterFromQuery(req, false)

	if got.Limit != 12 {
		t.Fatalf("Limit = %d, want 12", got.Limit)
	}
	if got.Offset != 24 {
		t.Fatalf("Offset = %d, want page-derived offset 24", got.Offset)
	}
}

func TestPostFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/posts?page=3&limit=12&offset=7", nil)

	got := postFilterFromQuery(req, false)

	if got.Offset != 7 {
		t.Fatalf("Offset = %d, want explicit offset 7", got.Offset)
	}
}

func TestPostFilterFromQueryReadsScheduledFilter(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/posts?scheduled=1", nil)

	got := postFilterFromQuery(req, true)

	if !got.Scheduled {
		t.Fatalf("Scheduled = %v, want true", got.Scheduled)
	}
}

func TestPostFilterFromQueryReadsFeaturedFilter(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/posts?featured=1", nil)

	got := postFilterFromQuery(req, true)

	if got.Featured == nil || *got.Featured != true {
		t.Fatalf("Featured = %#v, want true", got.Featured)
	}
}

func TestPostFilterFromQueryReadsUnfeaturedFilter(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/posts?featured=0", nil)

	got := postFilterFromQuery(req, true)

	if got.Featured == nil || *got.Featured != false {
		t.Fatalf("Featured = %#v, want false", got.Featured)
	}
}

func TestWantsPaginatedPostsResponse(t *testing.T) {
	tests := []struct {
		target string
		want   bool
	}{
		{target: "/api/posts", want: false},
		{target: "/api/posts?paged=1", want: true},
		{target: "/api/posts?page=2", want: true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.target, nil)
		if got := wantsPaginatedPostsResponse(req); got != tt.want {
			t.Fatalf("wantsPaginatedPostsResponse(%q) = %v, want %v", tt.target, got, tt.want)
		}
	}
}
