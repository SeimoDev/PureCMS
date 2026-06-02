package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCreateUserRejectsWeakPasswordBeforeStoreAccess(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/admin/users", strings.NewReader(`{"username":"weak","password":"password1","role":"editor","status":"active"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	(Server{}).createUser(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "密码至少 10 位") {
		t.Fatalf("body = %q, want password policy message", rec.Body.String())
	}
}

func TestUpdateUserPasswordRejectsWeakPasswordBeforeStoreAccess(t *testing.T) {
	req := httptest.NewRequest("PUT", "/api/admin/users/user-1/password", strings.NewReader(`{"password":"password1"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	(Server{}).updateUserPassword(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "密码至少 10 位") {
		t.Fatalf("body = %q, want password policy message", rec.Body.String())
	}
}

func TestUpdateMyPasswordRejectsWeakPasswordBeforeStoreAccess(t *testing.T) {
	req := httptest.NewRequest("PUT", "/api/admin/me/password", strings.NewReader(`{"currentPassword":"ChangeMe123!","newPassword":"password1"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	(Server{}).updateMyPassword(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "密码至少 10 位") {
		t.Fatalf("body = %q, want password policy message", rec.Body.String())
	}
}
