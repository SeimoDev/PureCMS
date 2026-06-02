package api

import (
	"net/http"
	"strings"

	"purecms/backend/internal/auth"
	"purecms/backend/internal/models"
)

func (s Server) updateMyProfile(w http.ResponseWriter, r *http.Request) {
	var input models.AccountProfileInput
	if !decodeJSON(w, r, &input) {
		return
	}
	claims := claimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "请先登录")
		return
	}
	user, err := s.store.UpdateAccountProfile(r.Context(), claims.UserID, input)
	if err != nil {
		writeStoreError(w, err, "更新账号资料失败")
		return
	}
	s.logAdminAction(r, "update_profile", "user", user.ID, map[string]any{"displayName": user.DisplayName})
	writeJSON(w, http.StatusOK, user)
}

func (s Server) logout(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "请先登录")
		return
	}
	if err := s.store.RevokeUserTokens(r.Context(), claims.UserID); err != nil {
		writeStoreError(w, err, "注销登录失败")
		return
	}
	s.logAdminAction(r, "logout", "user", claims.UserID, map[string]any{"username": claims.Username})
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) updateMyPassword(w http.ResponseWriter, r *http.Request) {
	var input models.AccountPasswordInput
	if !decodeJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.CurrentPassword) == "" {
		writeError(w, http.StatusBadRequest, "当前密码不能为空")
		return
	}
	input.NewPassword = strings.TrimSpace(input.NewPassword)
	if err := auth.ValidatePasswordPolicy(input.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, auth.PasswordPolicyMessage())
		return
	}
	claims := claimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "请先登录")
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		writeStoreError(w, err, "账号不存在")
		return
	}
	if !auth.CheckPassword(user.PasswordHash, input.CurrentPassword) {
		writeError(w, http.StatusBadRequest, "当前密码不正确")
		return
	}
	hash, err := auth.HashPassword(input.NewPassword)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "密码处理失败")
		return
	}
	if err := s.store.UpdateUserPassword(r.Context(), user.ID, hash); err != nil {
		writeStoreError(w, err, "更新密码失败")
		return
	}
	s.logAdminAction(r, "update_password", "user", user.ID, map[string]any{"self": true})
	w.WriteHeader(http.StatusNoContent)
}
