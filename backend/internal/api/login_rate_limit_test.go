package api

import (
	"testing"
	"time"
)

func TestLoginAttemptLimiterBlocksAfterMaxFailures(t *testing.T) {
	now := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	limiter := newLoginAttemptLimiter(15*time.Minute, 2)
	limiter.now = func() time.Time { return now }

	if limiter.blocked(" Admin ", "203.0.113.10") {
		t.Fatal("blocked before any failure")
	}

	limiter.recordFailure("admin", "203.0.113.10")
	if limiter.blocked("ADMIN", "203.0.113.10") {
		t.Fatal("blocked after one failure, want still allowed")
	}

	limiter.recordFailure("admin", "203.0.113.10")
	if !limiter.blocked("admin", "203.0.113.10") {
		t.Fatal("not blocked after max failures")
	}
	if limiter.blocked("admin", "203.0.113.11") {
		t.Fatal("blocked a different source address")
	}
}

func TestLoginAttemptLimiterExpiresWindow(t *testing.T) {
	now := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	limiter := newLoginAttemptLimiter(15*time.Minute, 1)
	limiter.now = func() time.Time { return now }
	limiter.recordFailure("admin", "203.0.113.10")

	if !limiter.blocked("admin", "203.0.113.10") {
		t.Fatal("not blocked inside window")
	}

	now = now.Add(16 * time.Minute)
	if limiter.blocked("admin", "203.0.113.10") {
		t.Fatal("still blocked after window expires")
	}
}

func TestLoginAttemptLimiterResetClearsFailures(t *testing.T) {
	limiter := newLoginAttemptLimiter(15*time.Minute, 1)
	limiter.recordFailure("admin", "203.0.113.10")
	limiter.reset("admin", "203.0.113.10")

	if limiter.blocked("admin", "203.0.113.10") {
		t.Fatal("blocked after reset")
	}
}
