package api

import (
	"errors"
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestValidateUserUpdatePolicyRejectsSelfRoleChange(t *testing.T) {
	existing := models.User{ID: "admin-1", Role: "admin", Status: "active"}
	input := models.UserInput{Role: "editor", Status: "active"}

	if err := validateUserUpdatePolicy(existing, input, "admin-1", 2); err == nil {
		t.Fatal("validateUserUpdatePolicy returned nil for self role change")
	}
}

func TestValidateUserUpdatePolicyRejectsSelfDisable(t *testing.T) {
	existing := models.User{ID: "admin-1", Role: "admin", Status: "active"}
	input := models.UserInput{Role: "admin", Status: "disabled"}

	if err := validateUserUpdatePolicy(existing, input, "admin-1", 2); err == nil {
		t.Fatal("validateUserUpdatePolicy returned nil for self disable")
	}
}

func TestValidateUserUpdatePolicyRejectsLastActiveAdminDemotion(t *testing.T) {
	existing := models.User{ID: "admin-1", Role: "admin", Status: "active"}
	input := models.UserInput{Role: "editor", Status: "active"}

	if err := validateUserUpdatePolicy(existing, input, "admin-2", 1); err == nil {
		t.Fatal("validateUserUpdatePolicy returned nil for last active admin demotion")
	}
}

func TestValidateUserUpdatePolicyAllowsAdminDemotionWhenAnotherAdminRemains(t *testing.T) {
	existing := models.User{ID: "admin-2", Role: "admin", Status: "active"}
	input := models.UserInput{Role: "editor", Status: "active"}

	if err := validateUserUpdatePolicy(existing, input, "admin-1", 2); err != nil {
		t.Fatalf("validateUserUpdatePolicy returned error: %v", err)
	}
}

func TestValidateUserUpdatePolicyAllowsSelfDisplayNameUpdate(t *testing.T) {
	existing := models.User{ID: "admin-1", Role: "admin", Status: "active"}
	input := models.UserInput{Role: "admin", Status: "active", DisplayName: "新站长"}

	if err := validateUserUpdatePolicy(existing, input, "admin-1", 1); err != nil {
		t.Fatalf("validateUserUpdatePolicy returned error for safe self update: %v", err)
	}
}

func TestValidateUserPasswordUpdatePolicyRejectsSelfPasswordReset(t *testing.T) {
	if err := validateUserPasswordUpdatePolicy("admin-1", "admin-1"); err == nil {
		t.Fatal("validateUserPasswordUpdatePolicy returned nil for self password reset")
	}
}

func TestValidateUserPasswordUpdatePolicyAllowsResettingAnotherUser(t *testing.T) {
	if err := validateUserPasswordUpdatePolicy("editor-1", "admin-1"); err != nil {
		t.Fatalf("validateUserPasswordUpdatePolicy returned error: %v", err)
	}
}

func TestValidateUserDeletePolicyRejectsSelfDelete(t *testing.T) {
	existing := models.User{ID: "admin-1", Role: "admin", Status: "active"}

	if err := validateUserDeletePolicy(existing, "admin-1", 2); err == nil {
		t.Fatal("validateUserDeletePolicy returned nil for self delete")
	}
}

func TestValidateUserDeletePolicyRejectsDeletingLastActiveAdmin(t *testing.T) {
	existing := models.User{ID: "admin-2", Role: "admin", Status: "active"}

	if err := validateUserDeletePolicy(existing, "admin-1", 1); err == nil {
		t.Fatal("validateUserDeletePolicy returned nil for deleting last active admin")
	}
}

func TestValidateUserDeletePolicyAllowsDeletingDisabledAdmin(t *testing.T) {
	existing := models.User{ID: "admin-2", Role: "admin", Status: "disabled"}

	if err := validateUserDeletePolicy(existing, "admin-1", 1); err != nil {
		t.Fatalf("validateUserDeletePolicy returned error for disabled admin: %v", err)
	}
}

func TestUserUpdatePolicyMessagesAreReadableChinese(t *testing.T) {
	tests := []struct {
		err  error
		want string
	}{
		{err: errSelfRoleChange, want: "不能修改当前登录账号的角色"},
		{err: errSelfStatusChange, want: "不能停用或变更当前登录账号状态"},
		{err: errSelfPasswordReset, want: "请在“我的账号”中修改当前账号密码"},
		{err: errSelfDelete, want: "不能删除当前登录账号"},
		{err: errLastActiveAdminGuard, want: "至少需要保留一个启用状态的管理员"},
		{err: errors.New("unknown"), want: "用户更新不符合安全策略"},
	}

	for _, tt := range tests {
		got := userUpdatePolicyMessage(tt.err)
		if got != tt.want {
			t.Fatalf("userUpdatePolicyMessage(%v) = %q, want %q", tt.err, got, tt.want)
		}
		assertReadableChineseMessage(t, got)
	}
}

func assertReadableChineseMessage(t *testing.T, message string) {
	t.Helper()
	for _, marker := range []string{"\u7ed4", "\u9353", "\u93c2", "\u7039", "\u7f08", "\ue044", "\ufffd"} {
		if strings.Contains(message, marker) {
			t.Fatalf("message contains mojibake marker %q: %q", marker, message)
		}
	}
}
