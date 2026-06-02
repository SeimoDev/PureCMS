package auth

import "testing"

func TestGenerateTokenIncludesTokenVersion(t *testing.T) {
	service := NewService("test-secret")

	raw, _, err := service.GenerateToken("user-1", "admin", "admin", 7)
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}
	claims, err := service.ParseToken(raw)
	if err != nil {
		t.Fatalf("ParseToken returned error: %v", err)
	}

	if claims.UserID != "user-1" || claims.Username != "admin" || claims.Role != "admin" {
		t.Fatalf("claims identity = %+v", claims)
	}
	if claims.TokenVersion != 7 {
		t.Fatalf("TokenVersion = %d, want 7", claims.TokenVersion)
	}
}
