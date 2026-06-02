package config

import "testing"

func TestLoadUsesLoginRateLimitDefaults(t *testing.T) {
	t.Setenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES", "")
	t.Setenv("LOGIN_RATE_LIMIT_MAX", "")

	cfg := Load()

	if cfg.LoginRateLimitWindowMinutes != 15 {
		t.Fatalf("LoginRateLimitWindowMinutes = %d, want 15", cfg.LoginRateLimitWindowMinutes)
	}
	if cfg.LoginRateLimitMax != 5 {
		t.Fatalf("LoginRateLimitMax = %d, want 5", cfg.LoginRateLimitMax)
	}
}

func TestLoadReadsLoginRateLimitEnv(t *testing.T) {
	t.Setenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES", "30")
	t.Setenv("LOGIN_RATE_LIMIT_MAX", "8")

	cfg := Load()

	if cfg.LoginRateLimitWindowMinutes != 30 {
		t.Fatalf("LoginRateLimitWindowMinutes = %d, want 30", cfg.LoginRateLimitWindowMinutes)
	}
	if cfg.LoginRateLimitMax != 8 {
		t.Fatalf("LoginRateLimitMax = %d, want 8", cfg.LoginRateLimitMax)
	}
}

func TestLoadBoundsLoginRateLimitEnv(t *testing.T) {
	t.Setenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES", "9000")
	t.Setenv("LOGIN_RATE_LIMIT_MAX", "200")

	cfg := Load()

	if cfg.LoginRateLimitWindowMinutes != 1440 {
		t.Fatalf("LoginRateLimitWindowMinutes = %d, want cap 1440", cfg.LoginRateLimitWindowMinutes)
	}
	if cfg.LoginRateLimitMax != 100 {
		t.Fatalf("LoginRateLimitMax = %d, want cap 100", cfg.LoginRateLimitMax)
	}
}

func TestLoadFallsBackForInvalidLoginRateLimitEnv(t *testing.T) {
	t.Setenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES", "invalid")
	t.Setenv("LOGIN_RATE_LIMIT_MAX", "0")

	cfg := Load()

	if cfg.LoginRateLimitWindowMinutes != 15 {
		t.Fatalf("LoginRateLimitWindowMinutes = %d, want fallback 15", cfg.LoginRateLimitWindowMinutes)
	}
	if cfg.LoginRateLimitMax != 5 {
		t.Fatalf("LoginRateLimitMax = %d, want fallback 5", cfg.LoginRateLimitMax)
	}
}
