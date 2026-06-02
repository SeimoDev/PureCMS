package api

import (
	"net/http/httptest"
	"testing"
)

func TestUserFilterFromQueryUsesPageOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/users?page=3&limit=15&q=站长&role=admin&status=active", nil)

	got := userFilterFromQuery(req)

	if got.Limit != 15 {
		t.Fatalf("Limit = %d, want 15", got.Limit)
	}
	if got.Offset != 30 {
		t.Fatalf("Offset = %d, want page-derived offset 30", got.Offset)
	}
	if got.Query != "站长" || got.Role != "admin" || got.Status != "active" {
		t.Fatalf("filter = %+v, want query/role/status populated", got)
	}
}

func TestUserFilterFromQueryKeepsExplicitOffset(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/admin/users?page=3&limit=15&offset=8", nil)

	got := userFilterFromQuery(req)

	if got.Offset != 8 {
		t.Fatalf("Offset = %d, want explicit offset 8", got.Offset)
	}
}

func TestWantsPaginatedUsersResponse(t *testing.T) {
	tests := []struct {
		target string
		want   bool
	}{
		{target: "/api/admin/users", want: false},
		{target: "/api/admin/users?paged=1", want: true},
		{target: "/api/admin/users?page=2", want: true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", tt.target, nil)
		if got := wantsPaginatedUsersResponse(req); got != tt.want {
			t.Fatalf("wantsPaginatedUsersResponse(%q) = %v, want %v", tt.target, got, tt.want)
		}
	}
}
