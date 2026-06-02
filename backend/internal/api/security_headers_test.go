package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSecurityHeadersApplied(t *testing.T) {
	rec := serveSecurityHeaderRequest(httptest.NewRequest(http.MethodGet, "/api/posts", nil))

	assertHeader(t, rec, "X-Content-Type-Options", "nosniff")
	assertHeader(t, rec, "Referrer-Policy", "strict-origin-when-cross-origin")
	assertHeader(t, rec, "X-Frame-Options", "SAMEORIGIN")
	assertHeader(t, rec, "Permissions-Policy", "camera=(), microphone=(), geolocation=()")
}

func TestSecurityHeadersNoStoreSensitiveResponses(t *testing.T) {
	tests := []struct {
		name   string
		method string
		target string
	}{
		{name: "admin get", method: http.MethodGet, target: "/api/admin/settings"},
		{name: "admin options", method: http.MethodOptions, target: "/api/admin/settings"},
		{name: "login", method: http.MethodPost, target: "/api/auth/login"},
		{name: "public write", method: http.MethodPost, target: "/api/posts/post-1/comments"},
		{name: "public delete", method: http.MethodDelete, target: "/api/posts/post-1/comments"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serveSecurityHeaderRequest(httptest.NewRequest(tt.method, tt.target, nil))

			if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "no-store") {
				t.Fatalf("Cache-Control = %q, want no-store", got)
			}
			assertHeader(t, rec, "Pragma", "no-cache")
			assertHeader(t, rec, "Expires", "0")
		})
	}
}

func TestSecurityHeadersLeavePublicReadsCacheNeutral(t *testing.T) {
	tests := []struct {
		name   string
		method string
		target string
	}{
		{name: "public api get", method: http.MethodGet, target: "/api/posts"},
		{name: "public api head", method: http.MethodHead, target: "/api/posts"},
		{name: "upload get", method: http.MethodGet, target: "/uploads/2026/06/cover.png"},
		{name: "robots", method: http.MethodGet, target: "/robots.txt"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serveSecurityHeaderRequest(httptest.NewRequest(tt.method, tt.target, nil))

			if got := rec.Header().Get("Cache-Control"); got != "" {
				t.Fatalf("Cache-Control = %q, want empty", got)
			}
			if got := rec.Header().Get("Pragma"); got != "" {
				t.Fatalf("Pragma = %q, want empty", got)
			}
			if got := rec.Header().Get("Expires"); got != "" {
				t.Fatalf("Expires = %q, want empty", got)
			}
		})
	}
}

func serveSecurityHeaderRequest(req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	handler := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	handler.ServeHTTP(rec, req)
	return rec
}

func assertHeader(t *testing.T, rec *httptest.ResponseRecorder, key, want string) {
	t.Helper()
	if got := rec.Header().Get(key); got != want {
		t.Fatalf("%s = %q, want %q", key, got, want)
	}
}
