package store

import (
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizeUserFilterDefaultsAndCapsLimit(t *testing.T) {
	got := normalizeUserFilter(models.UserFilter{Limit: 500, Offset: -4, Role: " ADMIN ", Status: " DISABLED "})

	if got.Limit != maxUserPageLimit {
		t.Fatalf("Limit = %d, want cap %d", got.Limit, maxUserPageLimit)
	}
	if got.Offset != 0 {
		t.Fatalf("Offset = %d, want 0", got.Offset)
	}
	if got.Role != "admin" || got.Status != "disabled" {
		t.Fatalf("filter = %+v, want normalized role/status", got)
	}
}

func TestUserListWhereIncludesRoleStatusAndQuery(t *testing.T) {
	filter := models.UserFilter{
		Query:  "站长",
		Role:   "admin",
		Status: "active",
	}

	where, args := userListWhere(filter)

	for _, want := range []string{
		"role=$1",
		"status=$2",
		"username ILIKE $3",
		"display_name ILIKE $3",
	} {
		if !strings.Contains(where, want) {
			t.Fatalf("userListWhere() = %q, want fragment %q", where, want)
		}
	}
	if len(args) != 3 {
		t.Fatalf("len(args) = %d, want 3", len(args))
	}
}

func TestUserTokenRevocationSQLBumpsTokenVersion(t *testing.T) {
	query := userTokenRevocationSQL()

	for _, want := range []string{
		"UPDATE users",
		"token_version=token_version+1",
		"WHERE id=$1",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("userTokenRevocationSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestUpdateUserSQLRevokesTokensOnRoleOrStatusChange(t *testing.T) {
	query := updateUserSQL()

	for _, want := range []string{
		"token_version=CASE",
		"WHEN role<>$2 OR status<>$3 THEN token_version+1",
		"ELSE token_version",
		"WHERE id=$4",
		"role='admin'",
		"status='active'",
		"($2<>'admin' OR $3<>'active')",
		"SELECT count(*) FROM users WHERE role='admin' AND status='active'",
		"<= 1",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("updateUserSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestUpdateUserGuardCheckMatchesLastActiveAdminRule(t *testing.T) {
	query := updateUserBlockedByLastAdminGuardSQL()

	for _, want := range []string{
		"SELECT EXISTS",
		"FROM users",
		"WHERE id=$1",
		"role='admin'",
		"status='active'",
		"($2<>'admin' OR $3<>'active')",
		"SELECT count(*) FROM users WHERE role='admin' AND status='active'",
		"<= 1",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("updateUserBlockedByLastAdminGuardSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestDeleteUserSQLKeepsLastActiveAdmin(t *testing.T) {
	query := deleteUserSQL()

	for _, want := range []string{
		"DELETE FROM users",
		"WHERE id=$1",
		"role='admin'",
		"status='active'",
		"SELECT count(*) FROM users WHERE role='admin' AND status='active'",
		"<= 1",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("deleteUserSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestDeleteUserGuardCheckMatchesLastActiveAdminRule(t *testing.T) {
	query := deleteUserBlockedByLastAdminGuardSQL()

	for _, want := range []string{
		"SELECT EXISTS",
		"FROM users",
		"WHERE id=$1",
		"role='admin'",
		"status='active'",
		"SELECT count(*) FROM users WHERE role='admin' AND status='active'",
		"<= 1",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("deleteUserBlockedByLastAdminGuardSQL() = %q, want fragment %q", query, want)
		}
	}
}

func TestUserDeleteGuardLockIDIsNonZero(t *testing.T) {
	if userDeleteGuardLockID == 0 {
		t.Fatal("user delete guard advisory lock id must be non-zero")
	}
}
