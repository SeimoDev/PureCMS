package api

import (
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"purecms/backend/internal/auth"
	"purecms/backend/internal/config"
	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

const (
	defaultJWTSecret              = "dev-secret-change-me"
	dockerPlaceholderJWTSecret    = "replace-with-a-long-random-secret"
	defaultAdminUsername          = "admin"
	defaultInitialAdminPassword   = "ChangeMe123!"
	defaultPostgresPasswordMarker = "cms_password"
)

func (s Server) systemStatus(w http.ResponseWriter, r *http.Request) {
	content, err := s.store.SystemContentStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取系统状态失败")
		return
	}
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取系统设置失败")
		return
	}
	status := models.SystemStatus{
		GeneratedAt: time.Now().UTC(),
		Database:    s.store.DatabaseStatus(r.Context()),
		Storage:     storageStatus(s.cfg.UploadDir),
		Content:     content,
		Translation: translationSystemStatus(settings, content),
		Runtime:     runtimeStatus(s.startedAt, time.Now().UTC()),
		Deployment:  deploymentStatus(s.cfg, settings),
	}
	writeJSON(w, http.StatusOK, status)
}

func runtimeStatus(startedAt, now time.Time) models.SystemRuntimeStatus {
	if startedAt.IsZero() {
		startedAt = now
	}
	uptime := now.Sub(startedAt)
	if uptime < 0 {
		uptime = 0
	}
	return models.SystemRuntimeStatus{
		GoVersion:     runtime.Version(),
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		ProcessID:     os.Getpid(),
		StartedAt:     startedAt.UTC(),
		UptimeSeconds: int64(uptime.Seconds()),
	}
}

func storageStatus(root string) models.SystemStorageStatus {
	status := models.SystemStorageStatus{
		Status:    "ok",
		UploadDir: root,
	}
	info, err := os.Stat(root)
	if err != nil {
		if os.IsNotExist(err) {
			status.Status = "warning"
			return status
		}
		status.Status = "error"
		return status
	}
	status.Exists = true
	if !info.IsDir() {
		status.Status = "error"
		return status
	}

	testFile, err := os.CreateTemp(root, ".cms-write-check-*")
	if err != nil {
		status.Status = "error"
	} else {
		status.Writable = true
		name := testFile.Name()
		_ = testFile.Close()
		_ = os.Remove(name)
	}

	_ = filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return nil
		}
		status.FileCount++
		status.TotalBytes += info.Size()
		return nil
	})
	return status
}

func translationSystemStatus(settings map[string]any, content models.SystemContentStats) models.SystemTranslationStatus {
	cfg := i18n.TranslationSettingsFrom(settings)
	languages := make([]models.SystemLanguage, 0, len(i18n.SupportedLanguages))
	for _, language := range i18n.SupportedLanguages {
		languages = append(languages, models.SystemLanguage{
			Code:       language.Code,
			Flag:       language.Flag,
			NativeName: language.NativeName,
			RTL:        language.RTL,
		})
	}
	return models.SystemTranslationStatus{
		Enabled:            cfg.Enabled,
		Provider:           cfg.Provider,
		Model:              cfg.Model,
		APIKeyConfigured:   strings.TrimSpace(cfg.APIKey) != "",
		CacheCount:         content.TranslationCaches,
		StaleCacheCount:    content.StaleTranslationCaches,
		JobCount:           content.TranslationJobs,
		RunningJobCount:    content.RunningTranslationJobs,
		FailedJobCount:     content.FailedTranslationJobs,
		SupportedLanguages: languages,
	}
}

func deploymentStatus(cfg config.Config, settings map[string]any) models.SystemDeploymentStatus {
	checks := []models.SystemDeploymentCheck{
		deploymentCheck(
			"jwt-secret",
			"JWT 密钥",
			jwtSecretReady(cfg.JWTSecret),
			"已使用自定义长密钥",
			"请设置 32 字符以上随机 JWT_SECRET，避免使用默认值或占位值",
		),
		deploymentCheck(
			"admin-username",
			"管理员用户名",
			adminUsernameReady(cfg.AdminUsername),
			"管理员用户名已改为非默认值",
			"请修改默认 ADMIN_USERNAME，避免公开系统暴露固定登录账号",
		),
		deploymentCheck(
			"admin-password",
			"初始化管理员密码",
			adminPasswordReady(cfg.AdminPassword),
			"初始化密码已修改且满足强度要求",
			"请修改默认 ADMIN_PASSWORD，默认密码只适合本地演示",
		),
		deploymentCheck(
			"database-password",
			"数据库密码",
			!strings.Contains(cfg.DatabaseURL, defaultPostgresPasswordMarker),
			"数据库连接串未使用示例密码",
			"请修改 PostgreSQL 默认密码并同步 DATABASE_URL",
		),
		deploymentCheck(
			"cors-origins",
			"CORS 来源",
			corsOriginsReady(cfg.CORSOrigins),
			"CORS 已显式限制来源",
			"请配置真实公开的 HTTP(S) CORS_ORIGINS，避免使用通配符、本机或内网来源",
		),
		deploymentCheck(
			"public-url",
			"公开访问地址",
			publicURLsReady(cfg.FrontendURL, cfg.PublicAPIURL),
			"FRONTEND_URL 和 PUBLIC_API_URL 已指向公开地址",
			"生产部署时请把 FRONTEND_URL/PUBLIC_API_URL 改为真实公开的 HTTP(S) 域名，不要保留 localhost、内网地址或非 HTTP 协议",
		),
		deploymentCheck(
			"maintenance-mode",
			"维护模式",
			!publicMaintenanceEnabled(settings),
			"公开访问正常开放",
			"维护模式正在开启：公开内容 API、RSS、sitemap 和 robots 已切换到维护状态",
		),
	}
	status := "ok"
	for _, check := range checks {
		if !check.OK {
			status = "warning"
			break
		}
	}
	return models.SystemDeploymentStatus{Status: status, Checks: checks}
}

func deploymentCheck(key, label string, ok bool, okDetail, warningDetail string) models.SystemDeploymentCheck {
	severity := "ok"
	detail := okDetail
	if !ok {
		severity = "warning"
		detail = warningDetail
	}
	return models.SystemDeploymentCheck{
		Key:      key,
		Label:    label,
		OK:       ok,
		Severity: severity,
		Detail:   detail,
	}
}

func jwtSecretReady(secret string) bool {
	value := strings.TrimSpace(secret)
	return len(value) >= 32 && value != defaultJWTSecret && value != dockerPlaceholderJWTSecret
}

func adminPasswordReady(password string) bool {
	value := strings.TrimSpace(password)
	return value != "" && value != defaultInitialAdminPassword && auth.ValidatePasswordPolicy(value) == nil
}

func adminUsernameReady(username string) bool {
	value := strings.TrimSpace(strings.ToLower(username))
	return value != "" && value != defaultAdminUsername
}

func corsOriginsReady(origins []string) bool {
	if len(origins) == 0 {
		return false
	}
	for _, origin := range origins {
		value := strings.TrimSpace(origin)
		if value == "*" || isUnsafePublicOrigin(value) {
			return false
		}
	}
	return true
}

func publicURLsReady(frontendURL, publicAPIURL string) bool {
	return !isUnsafePublicOrigin(frontendURL) && !isUnsafePublicOrigin(publicAPIURL)
}

func isUnsafePublicOrigin(value string) bool {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return true
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return true
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "" || host == "localhost" {
		return true
	}
	if ip, err := netip.ParseAddr(host); err == nil {
		return ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() || ip.IsLinkLocalUnicast()
	}
	return false
}
