package api

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"purecms/backend/internal/auth"
	"purecms/backend/internal/models"
	"purecms/backend/internal/store"

	"github.com/go-chi/chi/v5"
)

const maxUploadBytes int64 = 20 << 20
const maxMultipartUploadBytes int64 = maxUploadBytes + (1 << 20)
const defaultActivityLogRetentionDays = 180
const minActivityLogRetentionDays = 7
const maxActivityLogRetentionDays = 3650

var errUploadTooLarge = errors.New("upload too large")
var errInvalidBackupSnapshot = errors.New("invalid backup snapshot")

func (s Server) requireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := claimsFromContext(r.Context())
			if claims == nil {
				writeError(w, http.StatusUnauthorized, "请先登录")
				return
			}
			if claims.Role != role {
				writeError(w, http.StatusForbidden, "当前账号没有权限")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (s Server) listUsers(w http.ResponseWriter, r *http.Request) {
	filter := userFilterFromQuery(r)
	if wantsPaginatedUsersResponse(r) {
		page, err := s.store.ListUsersPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取用户失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	if hasUserListFilter(r) {
		users, err := s.store.ListUsers(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取用户失败")
			return
		}
		writeJSON(w, http.StatusOK, users)
		return
	}
	users, err := s.store.ListUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取用户失败")
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func userFilterFromQuery(r *http.Request) models.UserFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 20)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	return models.UserFilter{
		Query:  strings.TrimSpace(query.Get("q")),
		Role:   strings.TrimSpace(query.Get("role")),
		Status: strings.TrimSpace(query.Get("status")),
		Limit:  limit,
		Offset: offset,
	}
}

func wantsPaginatedUsersResponse(r *http.Request) bool {
	query := r.URL.Query()
	return parseBool(query.Get("paged")) || strings.TrimSpace(query.Get("page")) != ""
}

func hasUserListFilter(r *http.Request) bool {
	query := r.URL.Query()
	for _, key := range []string{"q", "role", "status", "limit", "offset"} {
		if strings.TrimSpace(query.Get(key)) != "" {
			return true
		}
	}
	return false
}

func (s Server) listPostRevisions(w http.ResponseWriter, r *http.Request) {
	revisions, err := s.store.ListPostRevisions(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取版本历史失败")
		return
	}
	writeJSON(w, http.StatusOK, revisions)
}

func (s Server) restorePostRevision(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	actorID := ""
	if claims != nil {
		actorID = claims.UserID
	}
	post, err := s.store.RestorePostRevision(r.Context(), chi.URLParam(r, "id"), chi.URLParam(r, "revisionId"), actorID)
	if err != nil {
		writeStoreError(w, err, "恢复版本失败")
		return
	}
	s.logAdminAction(r, "restore", "post", post.ID, postRevisionRestoreLogDetail(post, chi.URLParam(r, "revisionId")))
	s.triggerPublishedPostTranslations(r.Context(), post)
	writeJSON(w, http.StatusOK, post)
}

func revisionRestoreLogDetail(title, revisionID string) map[string]any {
	return map[string]any{
		"title":   title,
		"version": revisionID,
	}
}

func postRevisionRestoreLogDetail(post models.Post, revisionID string) map[string]any {
	detail := postMutationLogDetail(post)
	detail["version"] = revisionID
	return detail
}

func (s Server) createUser(w http.ResponseWriter, r *http.Request) {
	var input models.UserInput
	if !decodeJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.Username) == "" || strings.TrimSpace(input.Password) == "" {
		writeError(w, http.StatusBadRequest, "用户名和密码不能为空")
		return
	}
	input.Password = strings.TrimSpace(input.Password)
	if err := auth.ValidatePasswordPolicy(input.Password); err != nil {
		writeError(w, http.StatusBadRequest, auth.PasswordPolicyMessage())
		return
	}
	if strings.TrimSpace(input.DisplayName) == "" {
		input.DisplayName = strings.TrimSpace(input.Username)
	}
	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "密码处理失败")
		return
	}
	user, err := s.store.CreateUser(r.Context(), input, hash)
	if err != nil {
		writeStoreError(w, err, "创建用户失败")
		return
	}
	s.logAdminAction(r, "create", "user", user.ID, map[string]any{"username": user.Username, "role": user.Role})
	writeJSON(w, http.StatusCreated, user)
}

func (s Server) updateUser(w http.ResponseWriter, r *http.Request) {
	var input models.UserInput
	if !decodeJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.DisplayName) == "" {
		writeError(w, http.StatusBadRequest, "显示名称不能为空")
		return
	}
	id := chi.URLParam(r, "id")
	existing, err := s.store.GetUserByID(r.Context(), id)
	if err != nil {
		writeStoreError(w, err, "用户不存在")
		return
	}
	activeAdminCount, err := s.store.CountActiveAdmins(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取管理员状态失败")
		return
	}
	claims := claimsFromContext(r.Context())
	actorID := ""
	if claims != nil {
		actorID = claims.UserID
	}
	if err := validateUserUpdatePolicy(existing, input, actorID, activeAdminCount); err != nil {
		writeError(w, http.StatusBadRequest, userUpdatePolicyMessage(err))
		return
	}
	user, err := s.store.UpdateUser(r.Context(), id, input)
	if err != nil {
		var lastAdmin store.LastActiveAdminError
		if errors.As(err, &lastAdmin) {
			writeError(w, http.StatusBadRequest, userUpdatePolicyMessage(errLastActiveAdminGuard))
			return
		}
		writeStoreError(w, err, "更新用户失败")
		return
	}
	s.logAdminAction(r, "update", "user", user.ID, map[string]any{"username": user.Username, "role": user.Role, "status": user.Status})
	writeJSON(w, http.StatusOK, user)
}

func (s Server) updateUserPassword(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.Password) == "" {
		writeError(w, http.StatusBadRequest, "密码不能为空")
		return
	}
	input.Password = strings.TrimSpace(input.Password)
	if err := auth.ValidatePasswordPolicy(input.Password); err != nil {
		writeError(w, http.StatusBadRequest, auth.PasswordPolicyMessage())
		return
	}
	id := chi.URLParam(r, "id")
	claims := claimsFromContext(r.Context())
	actorID := ""
	if claims != nil {
		actorID = claims.UserID
	}
	if err := validateUserPasswordUpdatePolicy(id, actorID); err != nil {
		writeError(w, http.StatusBadRequest, userUpdatePolicyMessage(err))
		return
	}
	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "密码处理失败")
		return
	}
	if err := s.store.UpdateUserPassword(r.Context(), id, hash); err != nil {
		writeStoreError(w, err, "更新密码失败")
		return
	}
	s.logAdminAction(r, "update_password", "user", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := claimsFromContext(r.Context())
	actorID := ""
	if claims != nil {
		actorID = claims.UserID
	}
	existing, err := s.store.GetUserByID(r.Context(), id)
	if err != nil {
		writeStoreError(w, err, "用户不存在")
		return
	}
	activeAdminCount, err := s.store.CountActiveAdmins(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取管理员状态失败")
		return
	}
	if err := validateUserDeletePolicy(existing, actorID, activeAdminCount); err != nil {
		writeError(w, http.StatusBadRequest, userUpdatePolicyMessage(err))
		return
	}
	if err := s.store.DeleteUser(r.Context(), id); err != nil {
		var lastAdmin store.LastActiveAdminError
		if errors.As(err, &lastAdmin) {
			writeError(w, http.StatusBadRequest, userUpdatePolicyMessage(errLastActiveAdminGuard))
			return
		}
		writeStoreError(w, err, "删除用户失败")
		return
	}
	s.logAdminAction(r, "delete", "user", id, map[string]any{"username": existing.Username, "role": existing.Role, "status": existing.Status})
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) listActivityLogs(w http.ResponseWriter, r *http.Request) {
	filter := activityLogFilterFromQuery(r)
	if wantsPaginatedActivityLogsResponse(r) {
		page, err := s.store.ListActivityLogsPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取操作日志失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	logs, err := s.store.ListActivityLogs(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取操作日志失败")
		return
	}
	writeJSON(w, http.StatusOK, logs)
}

func activityLogFilterFromQuery(r *http.Request) models.ActivityLogFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 50)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	return models.ActivityLogFilter{
		Query:      strings.TrimSpace(query.Get("q")),
		Action:     strings.TrimSpace(query.Get("action")),
		EntityType: strings.TrimSpace(query.Get("entityType")),
		Limit:      limit,
		Offset:     offset,
	}
}

func wantsPaginatedActivityLogsResponse(r *http.Request) bool {
	query := r.URL.Query()
	return parseBool(query.Get("paged")) || strings.TrimSpace(query.Get("page")) != ""
}

type deleteOldActivityLogsResponse struct {
	Deleted       int64     `json:"deleted"`
	RetentionDays int       `json:"retentionDays"`
	Before        time.Time `json:"before"`
}

func activityLogRetentionDaysFromQuery(r *http.Request) int {
	days := parseInt(r.URL.Query().Get("days"), defaultActivityLogRetentionDays)
	if days < minActivityLogRetentionDays {
		return minActivityLogRetentionDays
	}
	if days > maxActivityLogRetentionDays {
		return maxActivityLogRetentionDays
	}
	return days
}

func (s Server) deleteOldActivityLogs(w http.ResponseWriter, r *http.Request) {
	days := activityLogRetentionDaysFromQuery(r)
	cutoff := store.ActivityLogRetentionCutoff(time.Now().UTC(), days)
	deleted, err := s.store.DeleteActivityLogsBefore(r.Context(), cutoff)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "清理操作日志失败")
		return
	}
	s.logAdminAction(r, "delete_old", "activity_logs", "retention", map[string]any{
		"deleted":       deleted,
		"retentionDays": days,
		"before":        cutoff.Format(time.RFC3339),
	})
	writeJSON(w, http.StatusOK, deleteOldActivityLogsResponse{
		Deleted:       deleted,
		RetentionDays: days,
		Before:        cutoff,
	})
}

func (s Server) exportBackup(w http.ResponseWriter, r *http.Request) {
	snapshot, err := s.store.BuildBackupSnapshot(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "导出备份失败")
		return
	}
	if err := embedBackupMediaFiles(s.cfg.UploadDir, &snapshot); err != nil {
		writeError(w, http.StatusInternalServerError, "导出媒体文件失败")
		return
	}
	filename := "cms-backup-" + time.Now().Format("20060102-150405") + ".json"
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	writeJSON(w, http.StatusOK, snapshot)
	s.logAdminAction(r, "export", "backup", filename, map[string]any{
		"posts":               len(snapshot.Posts),
		"pages":               len(snapshot.Pages),
		"postRevisions":       len(snapshot.PostRevisions),
		"pageRevisions":       len(snapshot.PageRevisions),
		"postTranslations":    len(snapshot.PostTranslations),
		"postTranslationJobs": len(snapshot.PostTranslationJobs),
		"media":               len(snapshot.MediaAssets),
		"users":               len(snapshot.Users),
		"logs":                len(snapshot.ActivityLogs),
	})
}

func (s Server) importBackup(w http.ResponseWriter, r *http.Request) {
	var snapshot models.BackupSnapshot
	if !decodeBackupSnapshot(w, r, &snapshot) {
		return
	}
	if err := validateBackupSnapshot(snapshot); err != nil {
		writeError(w, http.StatusBadRequest, "备份内容为空或格式不正确")
		return
	}
	mediaFiles, err := prepareBackupMediaFiles(s.cfg.UploadDir, snapshot.MediaAssets)
	if err != nil {
		writeError(w, http.StatusBadRequest, "备份媒体文件格式不正确")
		return
	}
	result, err := s.store.ImportBackupSnapshot(r.Context(), snapshot)
	if err != nil {
		writeStoreError(w, err, "导入备份失败")
		return
	}
	if err := restorePreparedBackupMediaFiles(mediaFiles); err != nil {
		writeError(w, http.StatusInternalServerError, "恢复媒体文件失败")
		return
	}
	s.logAdminAction(r, "import", "backup", "json", map[string]any{
		"posts":               result.Posts,
		"pages":               result.Pages,
		"postRevisions":       result.PostRevisions,
		"pageRevisions":       result.PageRevisions,
		"postTranslations":    result.PostTranslations,
		"postTranslationJobs": result.PostTranslationJobs,
		"media":               result.MediaAssets,
		"users":               result.Users,
		"logs":                result.ActivityLogs,
	})
	writeJSON(w, http.StatusOK, result)
}

func decodeBackupSnapshot(w http.ResponseWriter, r *http.Request, snapshot *models.BackupSnapshot) bool {
	return decodeJSONWithLimit(w, r, snapshot, maxBackupImportBytes, "备份文件过大或格式不正确")
}

func validateBackupSnapshot(snapshot models.BackupSnapshot) error {
	totalRecords := len(snapshot.Settings) +
		len(snapshot.Users) +
		len(snapshot.Posts) +
		len(snapshot.Pages) +
		len(snapshot.Categories) +
		len(snapshot.Tags) +
		len(snapshot.Comments) +
		len(snapshot.MediaAssets) +
		len(snapshot.ActivityLogs) +
		len(snapshot.PostRevisions) +
		len(snapshot.PageRevisions) +
		len(snapshot.PostTranslations) +
		len(snapshot.PostTranslationJobs) +
		len(snapshot.FriendLinks) +
		len(snapshot.ViewStats)
	if totalRecords == 0 {
		return errInvalidBackupSnapshot
	}
	for key := range snapshot.Settings {
		if strings.TrimSpace(key) == "" {
			return errInvalidBackupSnapshot
		}
	}
	for _, user := range snapshot.Users {
		if strings.TrimSpace(user.Username) == "" {
			return errInvalidBackupSnapshot
		}
	}
	for _, category := range snapshot.Categories {
		if backupBlank(category.Name, category.Slug) {
			return errInvalidBackupSnapshot
		}
	}
	for _, tag := range snapshot.Tags {
		if backupBlank(tag.Name, tag.Slug) {
			return errInvalidBackupSnapshot
		}
	}
	for _, post := range snapshot.Posts {
		if backupBlank(post.Title, post.Slug) {
			return errInvalidBackupSnapshot
		}
	}
	for _, page := range snapshot.Pages {
		if backupBlank(page.Title, page.Slug) {
			return errInvalidBackupSnapshot
		}
	}
	for _, asset := range snapshot.MediaAssets {
		if backupBlank(asset.Filename, asset.OriginalName, asset.MimeType, asset.URL) {
			return errInvalidBackupSnapshot
		}
	}
	for _, link := range snapshot.FriendLinks {
		if backupBlank(link.Name, link.URL) {
			return errInvalidBackupSnapshot
		}
	}
	return nil
}

func backupBlank(values ...string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			return true
		}
	}
	return false
}

type backupMediaFile struct {
	target  string
	content []byte
}

func embedBackupMediaFiles(root string, snapshot *models.BackupSnapshot) error {
	for i := range snapshot.MediaAssets {
		asset := &snapshot.MediaAssets[i]
		target, err := backupMediaTarget(root, asset.Filename)
		if err != nil {
			return err
		}
		info, err := os.Stat(target)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return err
		}
		if info.IsDir() {
			continue
		}
		raw, err := os.ReadFile(target)
		if err != nil {
			return err
		}
		asset.ContentBase64 = base64.StdEncoding.EncodeToString(raw)
	}
	return nil
}

func prepareBackupMediaFiles(root string, assets []models.MediaAsset) ([]backupMediaFile, error) {
	files := []backupMediaFile{}
	for _, asset := range assets {
		target, err := backupMediaTarget(root, asset.Filename)
		if err != nil {
			return nil, err
		}
		if strings.TrimSpace(asset.ContentBase64) == "" {
			continue
		}
		raw, err := base64.StdEncoding.DecodeString(asset.ContentBase64)
		if err != nil {
			return nil, err
		}
		if err := validateBackupMediaContent(asset, raw); err != nil {
			return nil, err
		}
		files = append(files, backupMediaFile{target: target, content: raw})
	}
	return files, nil
}

func restoreBackupMediaFiles(root string, assets []models.MediaAsset) error {
	files, err := prepareBackupMediaFiles(root, assets)
	if err != nil {
		return err
	}
	return restorePreparedBackupMediaFiles(files)
}

func backupMediaTarget(root, filename string) (string, error) {
	normalized := strings.ReplaceAll(strings.TrimSpace(filename), "\\", "/")
	if normalized == "" || strings.HasPrefix(normalized, "/") {
		return "", errors.New("unsafe media filename")
	}
	for _, part := range strings.Split(normalized, "/") {
		if part == "" || part == "." || part == ".." {
			return "", errors.New("unsafe media filename")
		}
	}
	target := filepath.Join(root, filepath.FromSlash(normalized))
	if !isSafeChildPath(root, target) {
		return "", errors.New("unsafe media filename")
	}
	return target, nil
}

func validateBackupMediaContent(asset models.MediaAsset, raw []byte) error {
	if int64(len(raw)) > maxUploadBytes {
		return errUploadTooLarge
	}
	if !backupMediaExtensionMatchesType(asset.Filename, asset.MimeType) {
		return errors.New("media filename extension does not match MIME type")
	}
	sample := raw
	if len(sample) > 512 {
		sample = sample[:512]
	}
	if _, ok := validateUploadMediaType(asset.MimeType, http.DetectContentType(sample)); !ok {
		return errors.New("unsupported backup media content")
	}
	return nil
}

func backupMediaExtensionMatchesType(filename, mimeType string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	switch canonicalMediaType(mimeType) {
	case "image/jpeg":
		return ext == ".jpg" || ext == ".jpeg"
	case "image/png":
		return ext == ".png"
	case "image/gif":
		return ext == ".gif"
	case "image/webp":
		return ext == ".webp"
	case "application/pdf":
		return ext == ".pdf"
	case "text/plain":
		return ext == ".txt"
	case "text/markdown":
		return ext == ".md" || ext == ".markdown"
	default:
		return false
	}
}

func restorePreparedBackupMediaFiles(files []backupMediaFile) error {
	for _, file := range files {
		if err := os.MkdirAll(filepath.Dir(file.target), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(file.target, file.content, 0o644); err != nil {
			return err
		}
	}
	return nil
}

func (s Server) listMedia(w http.ResponseWriter, r *http.Request) {
	filter := mediaAssetFilterFromQuery(r)
	if wantsPaginatedMediaResponse(r) {
		page, err := s.store.ListMediaAssetsPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取媒体库失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	if r.URL.Query().Get("limit") == "" {
		filter.Limit = 200
	}
	assets, err := s.store.ListMediaAssets(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取媒体库失败")
		return
	}
	writeJSON(w, http.StatusOK, assets)
}

func mediaAssetFilterFromQuery(r *http.Request) models.MediaAssetFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 24)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	return models.MediaAssetFilter{
		Query:    strings.TrimSpace(query.Get("q")),
		Kind:     strings.TrimSpace(query.Get("kind")),
		MimeType: strings.TrimSpace(query.Get("mimeType")),
		Limit:    limit,
		Offset:   offset,
	}
}

func wantsPaginatedMediaResponse(r *http.Request) bool {
	query := r.URL.Query()
	return parseBool(query.Get("paged")) || strings.TrimSpace(query.Get("page")) != ""
}

func (s Server) uploadMedia(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxMultipartUploadBytes)
	if err := r.ParseMultipartForm(maxMultipartUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "上传内容过大")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "请选择要上传的文件")
		return
	}
	defer file.Close()

	mimeType, err := detectUploadMediaType(file, header.Header.Get("Content-Type"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "只允许上传图片、PDF 或文本文件")
		return
	}
	relativeName, targetPath, err := s.allocateUploadPath(header.Filename, mimeType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "创建上传路径失败")
		return
	}
	target, err := os.Create(targetPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "保存文件失败")
		return
	}
	size, copyErr := copyLimitedUpload(target, file, maxUploadBytes)
	closeErr := target.Close()
	if errors.Is(copyErr, errUploadTooLarge) {
		_ = os.Remove(targetPath)
		writeError(w, http.StatusBadRequest, "上传内容过大")
		return
	}
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(targetPath)
		writeError(w, http.StatusInternalServerError, "保存文件失败")
		return
	}

	claims := claimsFromContext(r.Context())
	uploadedBy := ""
	if claims != nil {
		uploadedBy = claims.UserID
	}
	asset, err := s.store.CreateMediaAsset(r.Context(), models.MediaAssetInput{
		Filename:     relativeName,
		OriginalName: filepath.Base(header.Filename),
		MimeType:     mimeType,
		SizeBytes:    size,
		URL:          s.cfg.PublicAPIURL + "/uploads/" + path.Clean(strings.ReplaceAll(relativeName, "\\", "/")),
		AltText:      strings.TrimSpace(r.FormValue("altText")),
		UploadedBy:   uploadedBy,
	})
	if err != nil {
		_ = os.Remove(targetPath)
		writeStoreError(w, err, "记录媒体文件失败")
		return
	}
	s.logAdminAction(r, "upload", "media", asset.ID, map[string]any{"filename": asset.OriginalName, "size": asset.SizeBytes})
	writeJSON(w, http.StatusCreated, asset)
}

func (s Server) updateMediaAltText(w http.ResponseWriter, r *http.Request) {
	var input struct {
		AltText string `json:"altText"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	asset, err := s.store.UpdateMediaAssetAltText(r.Context(), chi.URLParam(r, "id"), input.AltText)
	if err != nil {
		writeStoreError(w, err, "更新媒体描述失败")
		return
	}
	s.logAdminAction(r, "update", "media", asset.ID, map[string]any{"filename": asset.OriginalName, "altText": asset.AltText})
	writeJSON(w, http.StatusOK, asset)
}

func (s Server) deleteMedia(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	asset, err := s.store.GetMediaAssetByID(r.Context(), id)
	if err != nil {
		writeStoreError(w, err, "删除媒体文件失败")
		return
	}
	references, err := s.store.CountMediaAssetReferences(r.Context(), asset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "检查媒体引用失败")
		return
	}
	if references > 0 {
		writeMediaAssetInUseError(w)
		return
	}
	asset, err = s.store.DeleteMediaAsset(r.Context(), id)
	if err != nil {
		var inUse store.MediaAssetInUseError
		if errors.As(err, &inUse) {
			writeMediaAssetInUseError(w)
			return
		}
		writeStoreError(w, err, "删除媒体文件失败")
		return
	}
	target := filepath.Join(s.cfg.UploadDir, filepath.FromSlash(asset.Filename))
	if isSafeChildPath(s.cfg.UploadDir, target) {
		_ = os.Remove(target)
	}
	s.logAdminAction(r, "delete", "media", asset.ID, map[string]any{"filename": asset.OriginalName})
	w.WriteHeader(http.StatusNoContent)
}

func writeMediaAssetInUseError(w http.ResponseWriter) {
	writeError(w, http.StatusConflict, "媒体仍被内容引用，请先从文章或页面中移除")
}

func (s Server) logAdminAction(r *http.Request, action, entityType, entityID string, detail map[string]any) {
	claims := claimsFromContext(r.Context())
	if claims == nil {
		return
	}
	_ = s.store.CreateActivityLog(r.Context(), models.ActivityLogInput{
		ActorID:       claims.UserID,
		ActorUsername: claims.Username,
		Action:        action,
		EntityType:    entityType,
		EntityID:      entityID,
		Detail:        detail,
		IPAddress:     clientIP(r),
		UserAgent:     r.UserAgent(),
	})
}

func (s Server) allocateUploadPath(original, mimeType string) (string, string, error) {
	ext := uploadFileExtension(original, mimeType)
	now := time.Now()
	name, err := randomHex(16)
	if err != nil {
		return "", "", err
	}
	relativeDir := filepath.Join(strconv.Itoa(now.Year()), twoDigits(int(now.Month())))
	relativeName := filepath.Join(relativeDir, name+ext)
	targetDir := filepath.Join(s.cfg.UploadDir, relativeDir)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return "", "", err
	}
	targetPath := filepath.Join(targetDir, name+ext)
	if !isSafeChildPath(s.cfg.UploadDir, targetPath) {
		return "", "", errors.New("unsafe upload path")
	}
	return filepath.ToSlash(relativeName), targetPath, nil
}

func uploadFileExtension(original, mimeType string) string {
	switch canonicalMediaType(mimeType) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "application/pdf":
		return ".pdf"
	case "text/plain":
		return ".txt"
	case "text/markdown":
		return ".md"
	default:
		ext := strings.ToLower(filepath.Ext(original))
		switch ext {
		case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".md", ".markdown":
			if ext == ".jpeg" {
				return ".jpg"
			}
			if ext == ".markdown" {
				return ".md"
			}
			return ext
		default:
			return ".bin"
		}
	}
}

func randomHex(size int) (string, error) {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func twoDigits(value int) string {
	if value < 10 {
		return "0" + strconv.Itoa(value)
	}
	return strconv.Itoa(value)
}

func allowedMediaType(value string) bool {
	switch canonicalMediaType(value) {
	case "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain", "text/markdown":
		return true
	default:
		return false
	}
}

func detectUploadMediaType(file io.ReadSeeker, declared string) (string, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		_, _ = file.Seek(0, io.SeekStart)
		return "", err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	if mediaType, ok := validateUploadMediaType(declared, http.DetectContentType(buffer[:n])); ok {
		return mediaType, nil
	}
	return "", errors.New("unsupported upload media type")
}

func validateUploadMediaType(declared, detected string) (string, bool) {
	declared = canonicalMediaType(declared)
	detected = canonicalMediaType(detected)
	if declared == "" || declared == "application/octet-stream" {
		if allowedMediaType(detected) {
			return detected, true
		}
		return "", false
	}
	if !allowedMediaType(declared) {
		return "", false
	}
	if strings.HasPrefix(declared, "text/") {
		if strings.HasPrefix(detected, "text/") {
			return declared, true
		}
		return "", false
	}
	if declared == detected {
		return declared, true
	}
	return "", false
}

func canonicalMediaType(value string) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return ""
	}
	mediaType, _, err := mime.ParseMediaType(trimmed)
	if err != nil {
		mediaType = strings.TrimSpace(strings.Split(trimmed, ";")[0])
	}
	return strings.ToLower(mediaType)
}

func copyLimitedUpload(dst io.Writer, src io.Reader, limit int64) (int64, error) {
	buffer := make([]byte, 32*1024)
	var written int64
	for {
		n, readErr := src.Read(buffer)
		if n > 0 {
			remaining := limit - written
			if remaining <= 0 {
				return written, errUploadTooLarge
			}
			toWrite := n
			if int64(toWrite) > remaining {
				toWrite = int(remaining)
			}
			copied, writeErr := dst.Write(buffer[:toWrite])
			written += int64(copied)
			if writeErr != nil {
				return written, writeErr
			}
			if copied != toWrite {
				return written, io.ErrShortWrite
			}
			if toWrite < n {
				return written, errUploadTooLarge
			}
		}
		if readErr == io.EOF {
			return written, nil
		}
		if readErr != nil {
			return written, readErr
		}
	}
}

func isSafeChildPath(root, target string) bool {
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return false
	}
	targetAbs, err := filepath.Abs(target)
	if err != nil {
		return false
	}
	rel, err := filepath.Rel(rootAbs, targetAbs)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

func uploadsFileServer(root string) http.Handler {
	fileServer := http.FileServer(http.Dir(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cleaned := path.Clean("/" + r.URL.Path)
		name := strings.TrimPrefix(cleaned, "/")
		if name == "" || name == "." {
			http.NotFound(w, r)
			return
		}
		target := filepath.Join(root, filepath.FromSlash(name))
		if !isSafeChildPath(root, target) {
			http.NotFound(w, r)
			return
		}
		info, err := os.Stat(target)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		applyPublicUploadHeaders(w)
		fileServer.ServeHTTP(w, r)
	})
}

func applyPublicUploadHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, max-age=2592000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
}
