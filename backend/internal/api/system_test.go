package api

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"purecms/backend/internal/config"
	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

func TestStorageStatusCountsFilesAndBytes(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "2026"), 0o755); err != nil {
		t.Fatalf("os.Mkdir returned error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "2026", "cover.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatalf("os.WriteFile returned error: %v", err)
	}

	got := storageStatus(root)

	if got.Status != "ok" || !got.Exists || !got.Writable {
		t.Fatalf("storage status = %+v, want ok/exists/writable", got)
	}
	if got.FileCount != 1 || got.TotalBytes != 5 {
		t.Fatalf("storage counts = %+v, want 1 file and 5 bytes", got)
	}
}

func TestStorageStatusFlagsMissingUploadDirectory(t *testing.T) {
	root := filepath.Join(t.TempDir(), "missing")

	got := storageStatus(root)

	if got.Status != "warning" || got.Exists || got.Writable {
		t.Fatalf("storage status = %+v, want warning without existing writable directory", got)
	}
	if got.UploadDir != root || got.FileCount != 0 || got.TotalBytes != 0 {
		t.Fatalf("storage detail = %+v, want requested path with empty counts", got)
	}
}

func TestStorageStatusFlagsNonDirectoryUploadTarget(t *testing.T) {
	root := filepath.Join(t.TempDir(), "uploads")
	if err := os.WriteFile(root, []byte("not a directory"), 0o644); err != nil {
		t.Fatalf("os.WriteFile returned error: %v", err)
	}

	got := storageStatus(root)

	if got.Status != "error" || !got.Exists || got.Writable {
		t.Fatalf("storage status = %+v, want existing non-writable error target", got)
	}
}

func TestTranslationSystemStatusRedactsAPIKey(t *testing.T) {
	got := translationSystemStatus(map[string]any{
		"translation": map[string]any{
			"enabled":  true,
			"provider": "openai-compatible",
			"model":    "gpt-test",
			"apiKey":   "secret",
		},
	}, models.SystemContentStats{
		TranslationCaches:      3,
		StaleTranslationCaches: 1,
		TranslationJobs:        5,
		RunningTranslationJobs: 2,
		FailedTranslationJobs:  1,
	})

	if !got.Enabled || !got.APIKeyConfigured {
		t.Fatalf("translation status = %+v, want enabled with configured key", got)
	}
	if got.Provider != "openai-compatible" || got.Model != "gpt-test" {
		t.Fatalf("translation provider/model = %+v", got)
	}
	if got.CacheCount != 3 || got.StaleCacheCount != 1 {
		t.Fatalf("translation cache counts = %+v", got)
	}
	if got.JobCount != 5 || got.RunningJobCount != 2 || got.FailedJobCount != 1 {
		t.Fatalf("translation job counts = %+v", got)
	}
	if len(got.SupportedLanguages) != len(i18n.SupportedLanguages) {
		t.Fatalf("supported languages = %d, want %d", len(got.SupportedLanguages), len(i18n.SupportedLanguages))
	}
}

func TestRuntimeStatusIncludesProcessMetadataAndUptime(t *testing.T) {
	startedAt := time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)
	now := startedAt.Add(90 * time.Second)

	got := runtimeStatus(startedAt, now)

	if got.GoVersion != runtime.Version() || got.OS != runtime.GOOS || got.Arch != runtime.GOARCH {
		t.Fatalf("runtime metadata = %+v, want current Go runtime", got)
	}
	if got.ProcessID <= 0 {
		t.Fatalf("ProcessID = %d, want positive pid", got.ProcessID)
	}
	if !got.StartedAt.Equal(startedAt) || got.UptimeSeconds != 90 {
		t.Fatalf("runtime timing = %+v, want startedAt and 90 seconds uptime", got)
	}
}

func TestRuntimeStatusClampsNegativeUptime(t *testing.T) {
	now := time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)

	got := runtimeStatus(now.Add(time.Minute), now)

	if got.UptimeSeconds != 0 {
		t.Fatalf("UptimeSeconds = %d, want 0 for future startedAt", got.UptimeSeconds)
	}
}

func TestHealthStatusRequiresDatabaseAndStorageReady(t *testing.T) {
	okDatabase := models.SystemDatabaseStatus{Status: "ok"}
	okStorage := models.SystemStorageStatus{Status: "ok", Exists: true, Writable: true}

	status, code := healthStatus(okDatabase, okStorage)
	if status != "ok" || code != 200 {
		t.Fatalf("healthStatus ok = %q/%d, want ok/200", status, code)
	}

	for _, tt := range []struct {
		name     string
		database models.SystemDatabaseStatus
		storage  models.SystemStorageStatus
	}{
		{name: "database error", database: models.SystemDatabaseStatus{Status: "error"}, storage: okStorage},
		{name: "storage warning", database: okDatabase, storage: models.SystemStorageStatus{Status: "warning"}},
		{name: "storage error", database: okDatabase, storage: models.SystemStorageStatus{Status: "error"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			status, code := healthStatus(tt.database, tt.storage)
			if status != "error" || code != 503 {
				t.Fatalf("healthStatus = %q/%d, want error/503", status, code)
			}
		})
	}
}

func TestDeploymentStatusWarnsForDefaultLocalConfig(t *testing.T) {
	got := deploymentStatus(config.Config{
		AdminUsername: "admin",
		JWTSecret:     defaultJWTSecret,
		AdminPassword: defaultInitialAdminPassword,
		DatabaseURL:   "postgres://cms:cms_password@localhost:5432/cms?sslmode=disable",
		FrontendURL:   "http://localhost:5173",
		PublicAPIURL:  "http://localhost:8080",
		CORSOrigins:   []string{"*"},
	}, map[string]any{})
	checks := deploymentChecksByKey(got)

	if got.Status != "warning" {
		t.Fatalf("Status = %q, want warning", got.Status)
	}
	for _, key := range []string{"jwt-secret", "admin-username", "admin-password", "database-password", "cors-origins", "public-url"} {
		if checks[key].OK {
			t.Fatalf("check %s = %+v, want warning", key, checks[key])
		}
		if checks[key].Detail == "" || checks[key].Severity != "warning" {
			t.Fatalf("check %s = %+v, want warning detail", key, checks[key])
		}
	}
	if checks["jwt-secret"].Label != "JWT 密钥" || !strings.Contains(checks["jwt-secret"].Detail, "JWT_SECRET") {
		t.Fatalf("jwt-secret copy = %+v, want readable Chinese label and detail", checks["jwt-secret"])
	}
	if checks["public-url"].Label != "公开访问地址" || !strings.Contains(checks["public-url"].Detail, "FRONTEND_URL/PUBLIC_API_URL") {
		t.Fatalf("public-url copy = %+v, want readable Chinese label and detail", checks["public-url"])
	}
}

func TestDeploymentStatusAcceptsProductionLikeConfig(t *testing.T) {
	got := deploymentStatus(config.Config{
		AdminUsername: "site-owner",
		JWTSecret:     "0123456789abcdef0123456789abcdef",
		AdminPassword: "ChangeThisPassword123!",
		DatabaseURL:   "postgres://cms:strong_password@example.internal:5432/cms?sslmode=require",
		FrontendURL:   "https://blog.example.com",
		PublicAPIURL:  "https://blog.example.com",
		CORSOrigins:   []string{"https://blog.example.com"},
	}, map[string]any{})

	if got.Status != "ok" {
		t.Fatalf("Status = %q, want ok: %+v", got.Status, got.Checks)
	}
	for _, check := range got.Checks {
		if !check.OK || check.Severity != "ok" {
			t.Fatalf("check = %+v, want ok", check)
		}
	}
}

func TestDeploymentStatusWarnsWhenMaintenanceModeEnabled(t *testing.T) {
	got := deploymentStatus(config.Config{
		AdminUsername: "site-owner",
		JWTSecret:     "0123456789abcdef0123456789abcdef",
		AdminPassword: "ChangeThisPassword123!",
		DatabaseURL:   "postgres://cms:strong_password@example.internal:5432/cms?sslmode=require",
		FrontendURL:   "https://blog.example.com",
		PublicAPIURL:  "https://blog.example.com",
		CORSOrigins:   []string{"https://blog.example.com"},
	}, map[string]any{
		"maintenance": map[string]any{"enabled": true},
	})
	checks := deploymentChecksByKey(got)

	if got.Status != "warning" {
		t.Fatalf("Status = %q, want warning", got.Status)
	}
	if checks["maintenance-mode"].OK || checks["maintenance-mode"].Severity != "warning" {
		t.Fatalf("maintenance-mode check = %+v, want warning", checks["maintenance-mode"])
	}
}

func TestDeploymentReadinessHelpers(t *testing.T) {
	if jwtSecretReady(dockerPlaceholderJWTSecret) {
		t.Fatal("docker placeholder JWT secret should not be ready")
	}
	if jwtSecretReady("short") {
		t.Fatal("short JWT secret should not be ready")
	}
	if adminPasswordReady(defaultInitialAdminPassword) {
		t.Fatal("default admin password should not be ready")
	}
	if adminPasswordReady("weak") {
		t.Fatal("weak admin password should not be ready")
	}
	if adminUsernameReady("admin") || adminUsernameReady(" ADMIN ") {
		t.Fatal("default admin username should not be ready")
	}
	if !adminUsernameReady("site-owner") {
		t.Fatal("custom admin username should be ready")
	}
	if corsOriginsReady([]string{"*"}) {
		t.Fatal("wildcard CORS origins should not be ready")
	}
	if corsOriginsReady([]string{"http://localhost:5173"}) {
		t.Fatal("localhost CORS origins should not be ready for production deployment")
	}
	if corsOriginsReady([]string{"ftp://blog.example.com"}) {
		t.Fatal("non-http CORS origins should not be ready")
	}
	if !corsOriginsReady([]string{"https://blog.example.com"}) {
		t.Fatal("https production CORS origin should be ready")
	}
	if publicURLsReady("https://blog.example.com", "http://127.0.0.1:8080") {
		t.Fatal("localhost public API URL should not be ready")
	}
	if publicURLsReady("https://blog.example.com", "ftp://blog.example.com") {
		t.Fatal("non-http public API URL should not be ready")
	}
	if publicURLsReady("https://192.168.1.10", "https://blog.example.com") {
		t.Fatal("private network frontend URL should not be ready")
	}
	if !publicURLsReady("https://blog.example.com", "https://blog.example.com") {
		t.Fatal("https production public URLs should be ready")
	}
}

func deploymentChecksByKey(status models.SystemDeploymentStatus) map[string]models.SystemDeploymentCheck {
	checks := map[string]models.SystemDeploymentCheck{}
	for _, check := range status.Checks {
		checks[check.Key] = check
	}
	return checks
}
