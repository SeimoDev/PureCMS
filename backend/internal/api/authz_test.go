package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"purecms/backend/internal/auth"
	"purecms/backend/internal/models"
)

func TestRefreshClaimsWithUserUsesCurrentRole(t *testing.T) {
	claims := &auth.Claims{
		UserID:       "user-1",
		Username:     "old-name",
		Role:         "admin",
		TokenVersion: 3,
	}
	user := models.User{
		ID:           "user-1",
		Username:     "editor",
		Role:         "editor",
		Status:       "active",
		TokenVersion: 3,
	}

	got, err := refreshClaimsWithUser(claims, user)
	if err != nil {
		t.Fatalf("refreshClaimsWithUser returned error: %v", err)
	}
	if got.Role != "editor" {
		t.Fatalf("Role = %q, want current database role", got.Role)
	}
	if got.Username != "editor" {
		t.Fatalf("Username = %q, want current database username", got.Username)
	}
	if got.TokenVersion != 3 {
		t.Fatalf("TokenVersion = %d, want current database token version", got.TokenVersion)
	}
}

func TestRefreshClaimsWithUserRejectsDisabledUser(t *testing.T) {
	claims := &auth.Claims{UserID: "user-1", Username: "admin", Role: "admin"}
	user := models.User{ID: "user-1", Username: "admin", Role: "admin", Status: "disabled"}

	if _, err := refreshClaimsWithUser(claims, user); err == nil {
		t.Fatal("refreshClaimsWithUser returned nil error for disabled user")
	}
}

func TestRefreshClaimsWithUserRejectsStaleTokenVersion(t *testing.T) {
	claims := &auth.Claims{UserID: "user-1", Username: "admin", Role: "admin", TokenVersion: 1}
	user := models.User{ID: "user-1", Username: "admin", Role: "admin", Status: "active", TokenVersion: 2}

	if _, err := refreshClaimsWithUser(claims, user); err != errTokenVersionStale {
		t.Fatalf("error = %v, want errTokenVersionStale", err)
	}
}

func TestRequireRoleAllowsOnlyMatchingRole(t *testing.T) {
	s := Server{}
	called := false
	handler := s.requireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/posts/post-1/permanent", nil)
	req = req.WithContext(context.WithValue(req.Context(), claimsKey, &auth.Claims{UserID: "editor-1", Role: "editor"}))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if called {
		t.Fatal("handler should not be called for non-admin role")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}

	req = httptest.NewRequest(http.MethodDelete, "/api/admin/posts/post-1/permanent", nil)
	req = req.WithContext(context.WithValue(req.Context(), claimsKey, &auth.Claims{UserID: "admin-1", Role: "admin"}))
	rec = httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("handler should be called for admin role")
	}
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
}

func TestAdminOnlyRoutesCoverSensitiveManagementAPIs(t *testing.T) {
	routes := Server{}.adminOnlyRoutes()
	got := map[string]bool{}
	for _, route := range routes {
		got[route.Method+" "+route.Pattern] = true
		if route.Handler == nil {
			t.Fatalf("%s %s has nil handler", route.Method, route.Pattern)
		}
	}

	want := []string{
		"GET /users",
		"POST /users",
		"PUT /users/{id}",
		"PUT /users/{id}/password",
		"DELETE /users/{id}",
		"DELETE /posts/{id}/permanent",
		"DELETE /pages/{id}/permanent",
		"GET /activity-logs",
		"DELETE /activity-logs/retention",
		"GET /backup/export",
		"POST /backup/import",
		"GET /system",
		"GET /translations",
		"POST /translations/backfill",
		"DELETE /translations/stale",
		"DELETE /translations/{id}",
		"GET /settings",
		"PUT /settings",
	}
	if len(routes) != len(want) {
		t.Fatalf("admin-only route count = %d, want %d", len(routes), len(want))
	}
	for _, key := range want {
		if !got[key] {
			t.Fatalf("admin-only routes missing %s", key)
		}
	}
}
