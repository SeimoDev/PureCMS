package api

import (
	"strings"
	"sync"
	"time"
)

const defaultLoginRateLimitWindow = 15 * time.Minute
const defaultLoginRateLimitMax = 5

type loginAttemptState struct {
	count       int
	firstFailed time.Time
}

type loginAttemptLimiter struct {
	mu       sync.Mutex
	window   time.Duration
	max      int
	now      func() time.Time
	attempts map[string]loginAttemptState
}

func newLoginAttemptLimiter(window time.Duration, max int) *loginAttemptLimiter {
	if window <= 0 {
		window = defaultLoginRateLimitWindow
	}
	if max <= 0 {
		max = defaultLoginRateLimitMax
	}
	return &loginAttemptLimiter{
		window:   window,
		max:      max,
		now:      time.Now,
		attempts: map[string]loginAttemptState{},
	}
}

func (l *loginAttemptLimiter) blocked(username, ip string) bool {
	if l == nil {
		return false
	}
	key := loginAttemptKey(username, ip)
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	state, ok := l.attempts[key]
	if !ok {
		return false
	}
	if now.Sub(state.firstFailed) > l.window {
		delete(l.attempts, key)
		return false
	}
	return state.count >= l.max
}

func (l *loginAttemptLimiter) recordFailure(username, ip string) {
	if l == nil {
		return
	}
	key := loginAttemptKey(username, ip)
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	l.pruneExpiredLocked(now)
	state := l.attempts[key]
	if state.firstFailed.IsZero() || now.Sub(state.firstFailed) > l.window {
		l.attempts[key] = loginAttemptState{count: 1, firstFailed: now}
		return
	}
	state.count++
	l.attempts[key] = state
}

func (l *loginAttemptLimiter) reset(username, ip string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, loginAttemptKey(username, ip))
}

func (l *loginAttemptLimiter) pruneExpiredLocked(now time.Time) {
	for key, state := range l.attempts {
		if now.Sub(state.firstFailed) > l.window {
			delete(l.attempts, key)
		}
	}
}

func loginAttemptKey(username, ip string) string {
	return strings.ToLower(auditUsername(username)) + "|" + strings.TrimSpace(ip)
}
