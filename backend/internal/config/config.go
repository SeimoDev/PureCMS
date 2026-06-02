package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                        string
	DatabaseURL                 string
	JWTSecret                   string
	FrontendURL                 string
	CORSOrigins                 []string
	AdminUsername               string
	AdminPassword               string
	AdminDisplayName            string
	UploadDir                   string
	PublicAPIURL                string
	LoginRateLimitWindowMinutes int
	LoginRateLimitMax           int
}

func Load() Config {
	return Config{
		Port:                        getEnv("PORT", "8080"),
		DatabaseURL:                 getEnv("DATABASE_URL", "postgres://cms:cms_password@localhost:5432/cms?sslmode=disable"),
		JWTSecret:                   getEnv("JWT_SECRET", "dev-secret-change-me"),
		FrontendURL:                 getEnv("FRONTEND_URL", "http://localhost:5173"),
		CORSOrigins:                 splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")),
		AdminUsername:               getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:               getEnv("ADMIN_PASSWORD", "ChangeMe123!"),
		AdminDisplayName:            getEnv("ADMIN_DISPLAY_NAME", "站长"),
		UploadDir:                   getEnv("UPLOAD_DIR", "uploads"),
		PublicAPIURL:                strings.TrimRight(getEnv("PUBLIC_API_URL", "http://localhost:8080"), "/"),
		LoginRateLimitWindowMinutes: getEnvInt("LOGIN_RATE_LIMIT_WINDOW_MINUTES", 15, 1, 1440),
		LoginRateLimitMax:           getEnvInt("LOGIN_RATE_LIMIT_MAX", 5, 1, 100),
	}
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

func getEnvInt(key string, fallback, minValue, maxValue int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < minValue {
		return fallback
	}
	if parsed > maxValue {
		return maxValue
	}
	return parsed
}
