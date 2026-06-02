package database

import (
	"strings"
	"testing"
)

func TestEnsureAdminSQLRestoresConfiguredAdminAccount(t *testing.T) {
	sql := ensureAdminSQL()

	for _, want := range []string{
		"ON CONFLICT (username) DO UPDATE SET",
		"WHEN users.role<>'admin' OR users.status<>'active' THEN excluded.password_hash",
		"ELSE users.password_hash",
		"role='admin'",
		"status='active'",
		"WHEN users.role<>'admin' OR users.status<>'active' THEN users.token_version+1",
		"ELSE users.token_version",
	} {
		if !strings.Contains(sql, want) {
			t.Fatalf("ensureAdminSQL should preserve startup admin recovery rule; missing %q in %s", want, sql)
		}
	}
}
