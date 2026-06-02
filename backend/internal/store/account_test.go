package store

import (
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizeAccountProfileInputTrimsDisplayName(t *testing.T) {
	got, err := NormalizeAccountProfileInput(models.AccountProfileInput{DisplayName: "  站长  "})
	if err != nil {
		t.Fatalf("NormalizeAccountProfileInput returned error: %v", err)
	}
	if got.DisplayName != "站长" {
		t.Fatalf("DisplayName = %q, want trimmed name", got.DisplayName)
	}
}

func TestNormalizeAccountProfileInputRejectsBlankDisplayName(t *testing.T) {
	_, err := NormalizeAccountProfileInput(models.AccountProfileInput{DisplayName: "  "})
	if err == nil {
		t.Fatal("NormalizeAccountProfileInput returned nil error for blank display name")
	}
}
