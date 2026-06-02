package auth

import "testing"

func TestValidatePasswordPolicyAcceptsStrongPassword(t *testing.T) {
	if err := ValidatePasswordPolicy("ChangeMe123!"); err != nil {
		t.Fatalf("ValidatePasswordPolicy returned error for strong password: %v", err)
	}
}

func TestValidatePasswordPolicyRejectsWeakPasswords(t *testing.T) {
	tests := []string{
		"short1A",
		"lowercase123",
		"UPPERCASE123",
		"NoDigitsHere",
		"          ",
	}

	for _, password := range tests {
		if err := ValidatePasswordPolicy(password); err == nil {
			t.Fatalf("ValidatePasswordPolicy(%q) returned nil, want weak password error", password)
		}
	}
}
