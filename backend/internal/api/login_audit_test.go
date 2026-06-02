package api

import (
	"strings"
	"testing"
)

func TestLoginAuditInputForInvalidCredentials(t *testing.T) {
	got := loginAuditInput("  missing_user  ", "invalid_credentials", "203.0.113.8", "Mozilla/5.0")

	if got.ActorID != "" {
		t.Fatalf("ActorID = %q, want empty actor for unauthenticated login failure", got.ActorID)
	}
	if got.ActorUsername != "missing_user" {
		t.Fatalf("ActorUsername = %q, want trimmed attempted username", got.ActorUsername)
	}
	if got.Action != "login_failed" {
		t.Fatalf("Action = %q, want login_failed", got.Action)
	}
	if got.EntityType != "auth" || got.EntityID != "missing_user" {
		t.Fatalf("entity = %q/%q, want auth/missing_user", got.EntityType, got.EntityID)
	}
	if got.IPAddress != "203.0.113.8" || got.UserAgent != "Mozilla/5.0" {
		t.Fatalf("source = %q/%q, want captured ip and user agent", got.IPAddress, got.UserAgent)
	}
	if got.Detail["reason"] != "invalid_credentials" {
		t.Fatalf("reason detail = %v, want invalid_credentials", got.Detail["reason"])
	}
}

func TestLoginAuditInputForDisabledAccount(t *testing.T) {
	got := loginAuditInput("disabled_admin", "disabled", "198.51.100.9", "curl/8")

	if got.Action != "login_blocked" {
		t.Fatalf("Action = %q, want login_blocked for disabled account", got.Action)
	}
	if got.Detail["reason"] != "disabled" {
		t.Fatalf("reason detail = %v, want disabled", got.Detail["reason"])
	}
}

func TestLoginAuditInputForRateLimitedAttempt(t *testing.T) {
	got := loginAuditInput("admin", "rate_limited", "198.51.100.9", "curl/8")

	if got.Action != "login_blocked" {
		t.Fatalf("Action = %q, want login_blocked for rate-limited attempt", got.Action)
	}
	if got.Detail["reason"] != "rate_limited" {
		t.Fatalf("reason detail = %v, want rate_limited", got.Detail["reason"])
	}
}

func TestLoginAuditInputLimitsAttemptedUsername(t *testing.T) {
	got := loginAuditInput(strings.Repeat("站", 160), "invalid_credentials", "", "")

	if len([]rune(got.ActorUsername)) != maxAuditUsernameRunes {
		t.Fatalf("ActorUsername rune length = %d, want %d", len([]rune(got.ActorUsername)), maxAuditUsernameRunes)
	}
	if got.EntityID != got.ActorUsername {
		t.Fatalf("EntityID = %q, want same sanitized username as ActorUsername", got.EntityID)
	}
}
