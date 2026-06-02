package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	"purecms/backend/internal/auth"
	"purecms/backend/internal/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, cfg config.Config) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	poolConfig.MaxConns = 10
	poolConfig.MinConns = 1

	deadline := time.Now().Add(60 * time.Second)
	var lastErr error
	for time.Now().Before(deadline) {
		pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				return pool, nil
			} else {
				lastErr = pingErr
			}
			pool.Close()
		} else {
			lastErr = err
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("connect database: %w", lastErr)
}

const migrationAdvisoryLockID int64 = 2026060201

func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()

	if err := acquireMigrationLock(ctx, conn); err != nil {
		return err
	}
	defer func() {
		if err := releaseMigrationLock(context.Background(), conn); err != nil {
			log.Printf("release migration lock failed: %v", err)
		}
	}()

	if _, err := conn.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`); err != nil {
		return err
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		filename := entry.Name()
		var exists bool
		if err := conn.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename=$1)", filename).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}

		sqlBytes, err := os.ReadFile(filepath.Join(migrationsDir, filename))
		if err != nil {
			return err
		}
		tx, err := conn.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("run migration %s: %w", filename, err)
		}
		if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (filename) VALUES ($1)", filename); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		log.Printf("applied migration %s", filename)
	}
	return nil
}

func acquireMigrationLock(ctx context.Context, conn *pgxpool.Conn) error {
	_, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1)", migrationAdvisoryLockID)
	return err
}

func releaseMigrationLock(ctx context.Context, conn *pgxpool.Conn) error {
	_, err := conn.Exec(ctx, "SELECT pg_advisory_unlock($1)", migrationAdvisoryLockID)
	return err
}

func EnsureAdmin(ctx context.Context, pool *pgxpool.Pool, cfg config.Config) error {
	hash, err := auth.HashPassword(cfg.AdminPassword)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, ensureAdminSQL(), cfg.AdminUsername, cfg.AdminDisplayName, hash)
	return err
}

func ensureAdminSQL() string {
	return `
INSERT INTO users (username, display_name, password_hash, role, status)
VALUES ($1, $2, $3, 'admin', 'active')
ON CONFLICT (username) DO UPDATE SET
  display_name=CASE
    WHEN btrim(users.display_name)='' THEN excluded.display_name
    ELSE users.display_name
  END,
  password_hash=CASE
    WHEN users.role<>'admin' OR users.status<>'active' THEN excluded.password_hash
    ELSE users.password_hash
  END,
  role='admin',
  status='active',
  token_version=CASE
    WHEN users.role<>'admin' OR users.status<>'active' THEN users.token_version+1
    ELSE users.token_version
  END`
}
