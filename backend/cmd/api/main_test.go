package main

import (
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"purecms/backend/internal/config"
)

func TestNewHTTPServerUsesProductionTimeouts(t *testing.T) {
	server := newHTTPServer(config.Config{Port: "9090"}, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))

	if server.Addr != ":9090" {
		t.Fatalf("Addr = %q, want :9090", server.Addr)
	}
	if server.Handler == nil {
		t.Fatal("Handler should be configured")
	}
	for label, got := range map[string]time.Duration{
		"ReadHeaderTimeout": server.ReadHeaderTimeout,
		"ReadTimeout":       server.ReadTimeout,
		"WriteTimeout":      server.WriteTimeout,
		"IdleTimeout":       server.IdleTimeout,
	} {
		if got <= 0 {
			t.Fatalf("%s = %s, want positive timeout", label, got)
		}
	}
	if server.ReadTimeout < server.ReadHeaderTimeout {
		t.Fatalf("ReadTimeout = %s should not be shorter than ReadHeaderTimeout = %s", server.ReadTimeout, server.ReadHeaderTimeout)
	}
	if server.WriteTimeout < 30*time.Second {
		t.Fatalf("WriteTimeout = %s, want enough time for backup and import responses", server.WriteTimeout)
	}
}

func TestMainStartsPublishedPostTranslationBackfill(t *testing.T) {
	raw, err := os.ReadFile("main.go")
	if err != nil {
		t.Fatalf("read main.go: %v", err)
	}
	source := string(raw)
	if !strings.Contains(source, "server.StartPublishedPostTranslationBackfill(ctx)") {
		t.Fatal("main should start publish-time translation backfill on API startup")
	}
	if strings.Index(source, "server.StartPublishedPostTranslationBackfill(ctx)") < strings.Index(source, "server := api.New(") {
		t.Fatal("translation backfill should start after the API server is constructed")
	}
}
