package store

import (
	"testing"

	"purecms/backend/internal/models"
)

func TestNormalizeFriendLinkInputAddsHTTPSAndDefaultsStatus(t *testing.T) {
	input := models.FriendLinkInput{
		Name:        "  友站  ",
		URL:         "example.com/blog ",
		Description: " 长期阅读的博客 ",
		LogoURL:     " https://example.com/logo.png ",
	}

	got, err := NormalizeFriendLinkInput(input)
	if err != nil {
		t.Fatalf("NormalizeFriendLinkInput returned error: %v", err)
	}
	if got.Name != "友站" {
		t.Fatalf("Name = %q, want %q", got.Name, "友站")
	}
	if got.URL != "https://example.com/blog" {
		t.Fatalf("URL = %q, want %q", got.URL, "https://example.com/blog")
	}
	if got.Description != "长期阅读的博客" {
		t.Fatalf("Description = %q, want trimmed description", got.Description)
	}
	if got.LogoURL != "https://example.com/logo.png" {
		t.Fatalf("LogoURL = %q, want trimmed logo URL", got.LogoURL)
	}
	if got.Status != "active" {
		t.Fatalf("Status = %q, want active", got.Status)
	}
}

func TestNormalizeFriendLinkInputPreservesHiddenStatus(t *testing.T) {
	got, err := NormalizeFriendLinkInput(models.FriendLinkInput{
		Name:   "归档友链",
		URL:    "https://hidden.example",
		Status: "hidden",
	})
	if err != nil {
		t.Fatalf("NormalizeFriendLinkInput returned error: %v", err)
	}
	if got.Status != "hidden" {
		t.Fatalf("Status = %q, want hidden", got.Status)
	}
}

func TestNormalizeFriendLinkInputRejectsInvalidURL(t *testing.T) {
	_, err := NormalizeFriendLinkInput(models.FriendLinkInput{
		Name: "坏链接",
		URL:  "javascript:alert(1)",
	})
	if err == nil {
		t.Fatal("NormalizeFriendLinkInput returned nil error for unsupported URL scheme")
	}
}

func TestNormalizeFriendLinkInputRejectsSchemeLikeURLsWithoutSlashes(t *testing.T) {
	cases := []string{
		"mailto:editor@example.com",
		"tel:123456789",
		"data:text/html,<h1>x</h1>",
	}

	for _, rawURL := range cases {
		t.Run(rawURL, func(t *testing.T) {
			_, err := NormalizeFriendLinkInput(models.FriendLinkInput{
				Name: "坏链接",
				URL:  rawURL,
			})
			if err == nil {
				t.Fatalf("NormalizeFriendLinkInput returned nil error for %q", rawURL)
			}
		})
	}
}

func TestNormalizeFriendLinkInputRejectsProtocolRelativeURL(t *testing.T) {
	_, err := NormalizeFriendLinkInput(models.FriendLinkInput{
		Name: "坏链接",
		URL:  "//evil.example.com",
	})
	if err == nil {
		t.Fatal("NormalizeFriendLinkInput returned nil error for protocol-relative URL")
	}
}

func TestNormalizeFriendLinkInputRejectsUserInfoURL(t *testing.T) {
	_, err := NormalizeFriendLinkInput(models.FriendLinkInput{
		Name: "伪装链接",
		URL:  "https://blog.example.com@evil.example.com/path",
	})
	if err == nil {
		t.Fatal("NormalizeFriendLinkInput returned nil error for URL with userinfo")
	}
}
