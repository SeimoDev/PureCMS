package api

import (
	"strings"
	"testing"
)

func TestMutatingAdminHandlersWriteActivityLogs(t *testing.T) {
	tests := []struct {
		filename string
		handlers []string
	}{
		{
			filename: "account.go",
			handlers: []string{
				"updateMyProfile",
				"logout",
				"updateMyPassword",
			},
		},
		{
			filename: "admin.go",
			handlers: []string{
				"restorePostRevision",
				"createUser",
				"updateUser",
				"updateUserPassword",
				"deleteUser",
				"deleteOldActivityLogs",
				"exportBackup",
				"importBackup",
				"uploadMedia",
				"updateMediaAltText",
				"deleteMedia",
			},
		},
		{
			filename: "friend_links.go",
			handlers: []string{
				"createFriendLink",
				"updateFriendLink",
				"deleteFriendLink",
			},
		},
		{
			filename: "pages.go",
			handlers: []string{
				"createPage",
				"updatePage",
				"deletePage",
				"restorePage",
				"permanentlyDeletePage",
				"restorePageRevision",
			},
		},
		{
			filename: "server.go",
			handlers: []string{
				"createPost",
				"updatePost",
				"deletePost",
				"restorePost",
				"permanentlyDeletePost",
				"createCategory",
				"updateCategory",
				"deleteCategory",
				"createTag",
				"updateTag",
				"deleteTag",
				"moderateComment",
				"replyComment",
				"deleteComment",
				"updateSettings",
			},
		},
		{
			filename: "translation_cache.go",
			handlers: []string{
				"backfillMissingTranslationCaches",
				"deleteTranslationCache",
				"deleteStaleTranslationCaches",
			},
		},
	}

	for _, tt := range tests {
		source := readAPISource(t, tt.filename)
		for _, handler := range tt.handlers {
			body := handlerSource(t, source, handler)
			if !strings.Contains(body, "s.logAdminAction(") {
				t.Fatalf("%s in %s should write an activity log", handler, tt.filename)
			}
		}
	}
}
