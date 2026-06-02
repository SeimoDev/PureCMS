package api

import (
	"errors"
	"strings"

	"purecms/backend/internal/models"
)

var (
	errSelfRoleChange       = errors.New("self role change")
	errSelfStatusChange     = errors.New("self status change")
	errSelfPasswordReset    = errors.New("self password reset")
	errSelfDelete           = errors.New("self delete")
	errLastActiveAdminGuard = errors.New("last active admin guard")
)

func validateUserUpdatePolicy(existing models.User, input models.UserInput, actorID string, activeAdminCount int) error {
	nextRole := effectiveUserRole(input.Role)
	nextStatus := effectiveUserStatus(input.Status)

	if existing.ID == actorID {
		if nextRole != existing.Role {
			return errSelfRoleChange
		}
		if nextStatus != existing.Status {
			return errSelfStatusChange
		}
	}

	if existing.Role == "admin" && existing.Status == "active" && (nextRole != "admin" || nextStatus != "active") && activeAdminCount <= 1 {
		return errLastActiveAdminGuard
	}

	return nil
}

func validateUserPasswordUpdatePolicy(targetID, actorID string) error {
	if strings.TrimSpace(targetID) != "" && targetID == actorID {
		return errSelfPasswordReset
	}
	return nil
}

func validateUserDeletePolicy(existing models.User, actorID string, activeAdminCount int) error {
	if strings.TrimSpace(existing.ID) != "" && existing.ID == actorID {
		return errSelfDelete
	}
	if existing.Role == "admin" && existing.Status == "active" && activeAdminCount <= 1 {
		return errLastActiveAdminGuard
	}
	return nil
}

func effectiveUserRole(role string) string {
	if strings.TrimSpace(role) == "editor" {
		return "editor"
	}
	return "admin"
}

func effectiveUserStatus(status string) string {
	if strings.TrimSpace(status) == "disabled" {
		return "disabled"
	}
	return "active"
}

func userUpdatePolicyMessage(err error) string {
	switch {
	case errors.Is(err, errSelfRoleChange):
		return "不能修改当前登录账号的角色"
	case errors.Is(err, errSelfStatusChange):
		return "不能停用或变更当前登录账号状态"
	case errors.Is(err, errSelfPasswordReset):
		return "请在“我的账号”中修改当前账号密码"
	case errors.Is(err, errSelfDelete):
		return "不能删除当前登录账号"
	case errors.Is(err, errLastActiveAdminGuard):
		return "至少需要保留一个启用状态的管理员"
	default:
		return "用户更新不符合安全策略"
	}
}
