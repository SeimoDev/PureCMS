package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestFrontendDockerDefaultsToSameOriginAPI(t *testing.T) {
	root := repositoryRoot(t)
	dockerfile := readRepoFile(t, root, "frontend", "Dockerfile")
	compose := readRepoFile(t, root, "docker-compose.yml")
	envExample := readRepoFile(t, root, ".env.example")

	assertContains(t, dockerfile, "ARG VITE_API_BASE_URL=/api", "frontend Dockerfile should default VITE_API_BASE_URL to /api")
	assertContains(t, compose, "VITE_API_BASE_URL: ${VITE_API_BASE_URL:-/api}", "docker-compose web build should default VITE_API_BASE_URL to /api")
	assertContains(t, compose, "PUBLIC_API_URL: ${PUBLIC_API_URL:-http://localhost:3000}", "docker-compose API should default PUBLIC_API_URL to frontend origin")
	assertContains(t, envExample, "VITE_API_BASE_URL=/api", ".env.example should document same-origin API default")
	assertContains(t, envExample, "PUBLIC_API_URL=http://localhost:3000", ".env.example should document upload URL default")
}

func TestDeploymentDocsWarnAboutDefaultAdminUsername(t *testing.T) {
	root := repositoryRoot(t)
	envExample := readRepoFile(t, root, ".env.example")
	readme := readRepoFile(t, root, "README.md")

	for _, content := range []struct {
		name  string
		value string
	}{
		{name: ".env.example", value: envExample},
		{name: "README.md", value: readme},
	} {
		assertContains(t, content.value, "ADMIN_USERNAME", content.name+" should mention changing default admin username")
		assertContains(t, content.value, "Production checklist", content.name+" should include production checklist")
	}
}

func TestEnvExampleDocumentsRuntimeNetworkingDefaults(t *testing.T) {
	root := repositoryRoot(t)
	envExample := readRepoFile(t, root, ".env.example")

	assertContains(t, envExample, "PORT=8080", ".env.example should document backend port")
	assertContains(t, envExample, "ADMIN_DISPLAY_NAME=站长", ".env.example should keep default display name readable")
	assertContains(t, envExample, "CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173", ".env.example should document local development CORS origins")
	for _, key := range []string{"CORS_ORIGINS", "FRONTEND_URL", "PUBLIC_API_URL"} {
		assertContains(t, envExample, key, ".env.example production checklist should mention "+key)
	}
}

func TestReadmeDocumentsSensitiveAdminAPIsAsAdminOnly(t *testing.T) {
	root := repositoryRoot(t)
	readme := readRepoFile(t, root, "README.md")

	for _, route := range []string{
		"`DELETE /api/admin/posts/{id}/permanent` (admin only)",
		"`DELETE /api/admin/pages/{id}/permanent` (admin only)",
		"`GET|PUT /api/admin/settings` (admin only)",
		"`GET|POST /api/admin/users` (admin only)",
		"`PUT|DELETE /api/admin/users/{id}` (admin only)",
		"`PUT /api/admin/users/{id}/password` (admin only)",
		"`GET /api/admin/activity-logs` (admin only)",
		"`DELETE /api/admin/activity-logs/retention?days=90` (admin only)",
		"`GET /api/admin/system` (admin only)",
		"`GET /api/admin/backup/export` (admin only)",
		"`POST /api/admin/backup/import` (admin only)",
		"`GET /api/admin/translations` (admin only)",
		"`POST /api/admin/translations/backfill` (admin only)",
		"`DELETE /api/admin/translations/stale` (admin only)",
		"`DELETE /api/admin/translations/{id}` (admin only)",
	} {
		assertContains(t, readme, route, "README should mark sensitive management API as admin-only")
	}
}

func TestReadmeDocumentsCommentAndRevisionAPIs(t *testing.T) {
	root := repositoryRoot(t)
	readme := readRepoFile(t, root, "README.md")

	for _, route := range []string{
		"`GET /api/admin/comments`",
		"`PUT /api/admin/comments/{id}/moderate`",
		"`POST /api/admin/comments/{id}/reply`",
		"`DELETE /api/admin/comments/{id}`",
		"`GET /api/admin/posts/{id}/revisions`",
		"`POST /api/admin/posts/{id}/revisions/{revisionId}/restore`",
		"`GET /api/admin/pages/{id}/revisions`",
		"`POST /api/admin/pages/{id}/revisions/{revisionId}/restore`",
		"`GET /api/posts/{id}/comments`",
		"`POST /api/posts/{id}/comments`",
	} {
		assertContains(t, readme, route, "README should document content management API "+route)
	}
}

func TestReadmeDocumentsStartupAdminRecovery(t *testing.T) {
	root := repositoryRoot(t)
	readme := readRepoFile(t, root, "README.md")

	assertContains(t, readme, "后端启动时会幂等初始化 `ADMIN_USERNAME`", "README should document startup admin bootstrap")
	assertContains(t, readme, "如果该用户名已存在但被降权或停用，会恢复为启用管理员", "README should document startup admin recovery")
	assertContains(t, readme, "递增 token 版本让旧登录态失效", "README should document token revocation")
}

func TestFrontendDockerUsesReproducibleInstall(t *testing.T) {
	root := repositoryRoot(t)
	dockerfile := readRepoFile(t, root, "frontend", "Dockerfile")

	assertContains(t, dockerfile, "COPY package*.json ./", "frontend Dockerfile should copy package manifests before installing dependencies")
	assertContains(t, dockerfile, "npm ci", "frontend Dockerfile should use lockfile for reproducible builds")
	if strings.Contains(dockerfile, "RUN npm install") {
		t.Fatalf("frontend Dockerfile should not use npm install for production image builds")
	}
}

func TestBackendDockerIncludesCertificateAuthorities(t *testing.T) {
	root := repositoryRoot(t)
	dockerfile := readRepoFile(t, root, "backend", "Dockerfile")

	assertContains(t, dockerfile, "apk add --no-cache ca-certificates", "backend Docker image should include CA roots")
}

func TestDockerBuildContextsIgnoreLocalArtifacts(t *testing.T) {
	root := repositoryRoot(t)
	frontendIgnore := readRepoFile(t, root, "frontend", ".dockerignore")
	backendIgnore := readRepoFile(t, root, "backend", ".dockerignore")

	for _, want := range []string{"node_modules/", "dist/", ".env", "*.log", "*.png"} {
		assertContains(t, frontendIgnore, want, "frontend .dockerignore should keep local artifacts out of image builds")
	}
	for _, want := range []string{".env", "*.log", "coverage/", "uploads/"} {
		assertContains(t, backendIgnore, want, "backend .dockerignore should keep local artifacts out of image builds")
	}
}

func TestDockerComposeBindsInternalDebugPortsToLoopback(t *testing.T) {
	root := repositoryRoot(t)
	compose := readRepoFile(t, root, "docker-compose.yml")

	assertContains(t, compose, `"127.0.0.1:5432:5432"`, "PostgreSQL should not bind to every host interface")
	assertContains(t, compose, `"127.0.0.1:8080:8080"`, "API debug port should not bind to every host interface")
	assertContains(t, compose, "ADMIN_DISPLAY_NAME: ${ADMIN_DISPLAY_NAME:-站长}", "compose should keep default display name readable")
	if strings.Contains(compose, `"5432:5432"`) || strings.Contains(compose, `"8080:8080"`) {
		t.Fatalf("docker-compose should bind db/api host ports to 127.0.0.1 only")
	}
}

func TestFrontendNginxProxiesAPIAndUploads(t *testing.T) {
	root := repositoryRoot(t)
	nginx := readRepoFile(t, root, "frontend", "nginx.conf")

	assertContains(t, nginx, "location = /healthz", "nginx should expose health endpoint")
	assertContains(t, nginx, "location ^~ /api/", "nginx should proxy same-origin API")
	assertContains(t, nginx, "proxy_pass http://api:8080/api/", "nginx should forward /api/")
	assertContains(t, nginx, "location ^~ /uploads/", "nginx should proxy uploads")
	assertContains(t, nginx, "proxy_pass http://api:8080/uploads/", "nginx should forward uploads")
	assertContains(t, nginx, "try_files $uri $uri/ /index.html;", "nginx should keep React Router fallback")
	assertContains(t, nginx, "add_header X-Content-Type-Options \"nosniff\" always;", "nginx should set nosniff")
	assertContains(t, nginx, "add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;", "nginx should set referrer policy")
	assertContains(t, nginx, "add_header Content-Security-Policy", "nginx should set content security policy")
	assertContains(t, nginx, "default-src 'self'", "nginx CSP should default to same-origin")
	assertContains(t, nginx, "object-src 'none'", "nginx CSP should block plugin/object content")
	assertContains(t, nginx, "frame-ancestors 'self'", "nginx CSP should restrict embedding")
	assertContains(t, nginx, "gzip on;", "nginx should gzip static text assets")
}

func TestFrontendNginxStaticAssetsKeepSecurityHeaders(t *testing.T) {
	root := repositoryRoot(t)
	nginx := readRepoFile(t, root, "frontend", "nginx.conf")
	block := nginxLocationBlock(t, nginx, `location ~* \.(?:css|js|woff2?|png|jpg|jpeg|gif|svg|ico)$`)

	for _, header := range []string{
		`add_header Cache-Control "public, immutable";`,
		`add_header X-Content-Type-Options "nosniff" always;`,
		`add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
		`add_header X-Frame-Options "SAMEORIGIN" always;`,
		`add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`,
		`add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http: https:; font-src 'self' data:; connect-src 'self' http: https:; media-src 'self' http: https:; form-action 'self'" always;`,
	} {
		assertContains(t, block, header, "nginx static asset location should keep "+header)
	}
}

func TestDockerComposeChecksAPIHealthBeforeStartingWeb(t *testing.T) {
	root := repositoryRoot(t)
	compose := readRepoFile(t, root, "docker-compose.yml")
	readme := readRepoFile(t, root, "README.md")

	assertContains(t, compose, "wget -qO- http://127.0.0.1:8080/api/health", "API service should expose healthcheck")
	assertContains(t, compose, "api:\n        condition: service_healthy", "web service should wait for healthy API")
	assertContains(t, compose, "wget -qO- http://127.0.0.1/healthz", "web service should expose healthcheck")
	assertContains(t, readme, "/api/health` 会探测数据库和上传目录", "README should document healthcheck readiness probes")
	assertContains(t, readme, "异常时返回 503", "README should document unhealthy healthcheck status code")
	assertContains(t, readme, "请求头、请求体、响应写入和空闲连接超时", "README should document API server production timeouts")
	assertContains(t, readme, "SIGINT/SIGTERM 时执行优雅关闭", "README should document graceful shutdown")
	assertContains(t, readme, "Docker 前端 Nginx 提供 `/healthz` 容器健康检查", "README should document web healthcheck")
	assertContains(t, readme, "Content-Security-Policy", "README should document frontend CSP header")
}

func TestOperationalPostgresBackupScriptsDocumented(t *testing.T) {
	root := repositoryRoot(t)
	operations := readRepoFile(t, root, "docs", "operations.md")
	backupPS := readRepoFile(t, root, "ops", "backup-postgres.ps1")
	restorePS := readRepoFile(t, root, "ops", "restore-postgres.ps1")
	backupSH := readRepoFile(t, root, "ops", "backup-postgres.sh")
	restoreSH := readRepoFile(t, root, "ops", "restore-postgres.sh")
	backupUploadsPS := readRepoFile(t, root, "ops", "backup-uploads.ps1")
	restoreUploadsPS := readRepoFile(t, root, "ops", "restore-uploads.ps1")
	backupUploadsSH := readRepoFile(t, root, "ops", "backup-uploads.sh")
	restoreUploadsSH := readRepoFile(t, root, "ops", "restore-uploads.sh")

	for path, content := range map[string]string{
		"ops/backup-postgres.ps1":  backupPS,
		"ops/backup-postgres.sh":   backupSH,
		"ops/restore-postgres.ps1": restorePS,
		"ops/restore-postgres.sh":  restoreSH,
		"ops/backup-uploads.ps1":   backupUploadsPS,
		"ops/backup-uploads.sh":    backupUploadsSH,
		"ops/restore-uploads.ps1":  restoreUploadsPS,
		"ops/restore-uploads.sh":   restoreUploadsSH,
	} {
		assertContains(t, operations, path, "operations docs should document "+path)
		assertContains(t, content, "docker compose exec -T", path+" should run against a compose service")
	}
	assertContains(t, backupPS, "pg_dump", "PowerShell backup should use pg_dump")
	assertContains(t, backupSH, "pg_dump", "shell backup should use pg_dump")
	assertContains(t, backupUploadsPS, "docker compose cp", "PowerShell uploads backup should copy archives out")
	assertContains(t, restoreUploadsPS, "docker compose cp", "PowerShell uploads restore should copy archives in")
	assertContains(t, restorePS, "ConfirmText", "PowerShell restore should require explicit confirmation")
	assertContains(t, restoreSH, "RESTORE", "shell restore should require explicit confirmation")
	assertContains(t, restorePS, "ON_ERROR_STOP=1", "PowerShell restore should stop on SQL errors")
	assertContains(t, restoreSH, "ON_ERROR_STOP=1", "shell restore should stop on SQL errors")
	if strings.Contains(restoreUploadsPS, "Get-Content -LiteralPath $resolvedBackup -AsByteStream |") {
		t.Fatalf("PowerShell uploads restore should not stream tar.gz through a PowerShell pipeline")
	}
}

func TestQualityGateScriptsAndCIAreDocumented(t *testing.T) {
	root := repositoryRoot(t)
	readme := readRepoFile(t, root, "README.md")
	operations := readRepoFile(t, root, "docs", "operations.md")
	checkPS := readRepoFile(t, root, "ops", "quality-check.ps1")
	checkSH := readRepoFile(t, root, "ops", "quality-check.sh")
	workflow := readRepoFile(t, root, ".github", "workflows", "quality.yml")

	for _, command := range []string{`.\ops\quality-check.ps1`, `sh ops/quality-check.sh`} {
		assertContains(t, readme, command, "README should document repository quality gate command")
		assertContains(t, operations, command, "operations docs should document repository quality gate command")
	}
	assertContains(t, readme, "Quality Gate", "README should document the CI quality gate")
	assertContains(t, readme, "-IncludeDockerBuild", "README should document local Docker image checks")
	assertContains(t, readme, "--include-docker-build", "README should document shell Docker image checks")
	assertContains(t, operations, "-IncludeDockerBuild", "operations docs should document PowerShell Docker image checks")
	assertContains(t, operations, "--include-docker-build", "operations docs should document shell Docker image checks")
	for path, content := range map[string]string{
		"ops/quality-check.ps1": checkPS,
		"ops/quality-check.sh":  checkSH,
	} {
		for _, want := range []string{"go", "test", "./...", "npm", "lint", "build"} {
			assertContains(t, content, want, path+" should include "+want)
		}
	}
	assertContains(t, checkPS, "SkipFrontendBuild", "PowerShell quality gate should support quick iteration without build")
	assertContains(t, checkPS, "IncludeDockerBuild", "PowerShell quality gate should support optional Docker image builds")
	assertContains(t, checkSH, "--skip-frontend-build", "shell quality gate should support quick iteration without build")
	assertContains(t, checkSH, "--include-docker-build", "shell quality gate should support optional Docker image builds")
	for _, content := range map[string]string{"PowerShell": checkPS, "shell": checkSH} {
		assertContains(t, content, "docker", "local quality gate should include Docker commands")
		assertContains(t, content, "purecms-api", "local quality gate should build backend image")
		assertContains(t, content, "purecms-web", "local quality gate should build frontend image")
		assertContains(t, content, "VITE_API_BASE_URL=/api", "local quality gate should build frontend image with same-origin API")
	}
	for _, command := range []string{"go test ./...", "npm ci", "npm test", "npm run lint", "npm run build"} {
		assertContains(t, workflow, command, "GitHub Actions quality gate should run "+command)
	}
	for _, command := range []string{
		"docker build -t purecms-api:test ./backend",
		"docker build --build-arg VITE_API_BASE_URL=/api -t purecms-web:test ./frontend",
	} {
		assertContains(t, workflow, command, "GitHub Actions quality gate should run "+command)
	}
	assertContains(t, workflow, "go-version-file: backend/go.mod", "GitHub Actions should use backend Go version file")
	assertContains(t, workflow, "cache-dependency-path: frontend/package-lock.json", "GitHub Actions should cache frontend dependencies from lockfile")
}

func TestReadmeDocumentsPublishTimeTranslationPolicy(t *testing.T) {
	root := repositoryRoot(t)
	readme := readRepoFile(t, root, "README.md")

	assertContains(t, readme, "文章发布或更新为已发布状态后，后台会自动翻译到所有内置语言并缓存", "README should document publish-time translation generation")
	assertContains(t, readme, "保存设置后后台会自动扫描已发布文章并把缺失语言加入翻译队列", "README should document automatic translation backfill")
	for _, stale := range []string{"访问时自动翻译", "惰性请求 AI 翻译", "未启用或未配置 AI Key 时返回 503"} {
		if strings.Contains(readme, stale) {
			t.Fatalf("README still documents stale on-visit translation behavior: %q", stale)
		}
	}
}

func TestRepositoryDocsDoNotContainMojibake(t *testing.T) {
	root := repositoryRoot(t)
	for _, path := range [][]string{
		{"README.md"},
		{".env.example"},
		{"docker-compose.yml"},
		{"docs", "operations.md"},
	} {
		content := readRepoFile(t, root, path...)
		assertNoMojibake(t, strings.Join(path, "/"), content)
	}
}

func repositoryRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate deployment test file")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", ".."))
}

func readRepoFile(t *testing.T, root string, parts ...string) string {
	t.Helper()
	path := filepath.Join(append([]string{root}, parts...)...)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func assertContains(t *testing.T, value, substring, message string) {
	t.Helper()
	if !strings.Contains(value, substring) {
		t.Fatalf("%s: missing %q", message, substring)
	}
}

func assertNoMojibake(t *testing.T, name, content string) {
	t.Helper()
	for _, marker := range []string{"\u7ed4", "\u9353", "\u93c2", "\u7039", "\u7f08", "\ue044", "\ufffd"} {
		if strings.Contains(content, marker) {
			t.Fatalf("%s contains mojibake marker %q", name, marker)
		}
	}
}

func nginxLocationBlock(t *testing.T, nginx, marker string) string {
	t.Helper()
	start := strings.Index(nginx, marker)
	if start < 0 {
		t.Fatalf("nginx config missing location marker %q", marker)
	}
	rest := nginx[start:]
	end := strings.Index(rest, "\n  }")
	if end < 0 {
		t.Fatalf("nginx location %q is missing closing brace", marker)
	}
	return rest[:end]
}
