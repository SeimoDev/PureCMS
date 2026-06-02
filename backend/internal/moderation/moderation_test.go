package moderation

import "testing"

func TestDetermineCommentStatus(t *testing.T) {
	tests := []struct {
		name       string
		content    string
		moderation bool
		keywords   []string
		want       string
	}{
		{name: "requires review by default", content: "正常交流", moderation: true, want: "pending"},
		{name: "approves when moderation disabled", content: "正常交流", moderation: false, want: "approved"},
		{name: "marks spam by keyword", content: "这里有推广链接", moderation: true, keywords: []string{"推广"}, want: "spam"},
		{name: "keyword match is case insensitive", content: "BUY now", moderation: false, keywords: []string{"buy"}, want: "spam"},
		{name: "ignores blank keywords", content: "正常交流", moderation: false, keywords: []string{" ", ""}, want: "approved"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DetermineCommentStatus(tt.content, tt.moderation, tt.keywords)
			if got != tt.want {
				t.Fatalf("DetermineCommentStatus() = %q, want %q", got, tt.want)
			}
		})
	}
}
