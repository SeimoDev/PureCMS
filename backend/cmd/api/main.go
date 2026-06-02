package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"purecms/backend/internal/api"
	"purecms/backend/internal/auth"
	"purecms/backend/internal/config"
	"purecms/backend/internal/database"
	"purecms/backend/internal/store"
)

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg)
	if err != nil {
		log.Fatalf("database connect failed: %v", err)
	}
	defer pool.Close()
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Fatalf("upload dir initialization failed: %v", err)
	}

	if err := database.RunMigrations(ctx, pool, "migrations"); err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	if err := database.EnsureAdmin(ctx, pool, cfg); err != nil {
		log.Fatalf("admin initialization failed: %v", err)
	}

	server := api.New(cfg, store.New(pool), auth.NewService(cfg.JWTSecret))
	server.StartPublishedPostTranslationBackfill(ctx)
	httpServer := newHTTPServer(cfg, server.Handler())

	go func() {
		log.Printf("cms api listening on :%s", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown failed: %v", err)
	}
}

func newHTTPServer(cfg config.Config, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
}
