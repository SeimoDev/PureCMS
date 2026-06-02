package store

import (
	"testing"
	"time"
)

func TestIsPubliclyVisiblePost(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)

	tests := []struct {
		name        string
		status      string
		publishedAt *time.Time
		want        bool
	}{
		{name: "published without time is visible", status: "published", publishedAt: nil, want: true},
		{name: "published in past is visible", status: "published", publishedAt: &past, want: true},
		{name: "published exactly now is visible", status: "published", publishedAt: &now, want: true},
		{name: "published in future is hidden", status: "published", publishedAt: &future, want: false},
		{name: "draft is hidden", status: "draft", publishedAt: &past, want: false},
		{name: "archived is hidden", status: "archived", publishedAt: &past, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsPubliclyVisiblePost(tt.status, tt.publishedAt, now); got != tt.want {
				t.Fatalf("IsPubliclyVisiblePost(%q) = %v, want %v", tt.status, got, tt.want)
			}
		})
	}
}
