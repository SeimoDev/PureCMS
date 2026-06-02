package moderation

import "strings"

func DetermineCommentStatus(content string, moderation bool, keywords []string) string {
	normalizedContent := strings.ToLower(content)
	for _, keyword := range keywords {
		normalizedKeyword := strings.ToLower(strings.TrimSpace(keyword))
		if normalizedKeyword != "" && strings.Contains(normalizedContent, normalizedKeyword) {
			return "spam"
		}
	}
	if moderation {
		return "pending"
	}
	return "approved"
}
