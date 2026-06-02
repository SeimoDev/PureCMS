package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func normalizeRole(role string) string {
	switch strings.TrimSpace(role) {
	case "editor":
		return "editor"
	default:
		return "admin"
	}
}

func normalizeUserStatus(status string) string {
	if strings.TrimSpace(status) == "disabled" {
		return "disabled"
	}
	return "active"
}

const defaultUserPageLimit = 20
const maxUserPageLimit = 200
const maxMediaAltTextRunes = 160
const defaultMediaAssetPageLimit = 24
const maxMediaAssetPageLimit = 200
const defaultActivityLogPageLimit = 50
const maxActivityLogPageLimit = 200
const userDeleteGuardLockID int64 = 2026060201

type LastActiveAdminError struct{}

func (e LastActiveAdminError) Error() string {
	return "cannot delete last active admin"
}

type MediaAssetInUseError struct{}

func (e MediaAssetInUseError) Error() string {
	return "media asset is still referenced"
}

func NormalizeMediaAltText(value string) string {
	trimmed := strings.TrimSpace(value)
	runes := []rune(trimmed)
	if len(runes) > maxMediaAltTextRunes {
		return string(runes[:maxMediaAltTextRunes])
	}
	return trimmed
}

func normalizeMediaAssetFilter(filter models.MediaAssetFilter) models.MediaAssetFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultMediaAssetPageLimit
	}
	if filter.Limit > maxMediaAssetPageLimit {
		filter.Limit = maxMediaAssetPageLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Kind = strings.ToLower(strings.TrimSpace(filter.Kind))
	switch filter.Kind {
	case "image", "pdf", "text", "other":
	default:
		filter.Kind = ""
	}
	filter.MimeType = strings.ToLower(strings.TrimSpace(filter.MimeType))
	return filter
}

func mediaAssetListWhere(filter models.MediaAssetFilter) (string, []any) {
	filter = normalizeMediaAssetFilter(filter)
	args := []any{}
	conditions := []string{"1=1"}
	if filter.MimeType != "" {
		args = append(args, filter.MimeType)
		conditions = append(conditions, fmt.Sprintf("mime_type=$%d", len(args)))
	} else {
		switch filter.Kind {
		case "image":
			conditions = append(conditions, "mime_type LIKE 'image/%'")
		case "pdf":
			conditions = append(conditions, "mime_type='application/pdf'")
		case "text":
			conditions = append(conditions, "mime_type LIKE 'text/%'")
		case "other":
			conditions = append(conditions, "(mime_type NOT LIKE 'image/%' AND mime_type<>'application/pdf' AND mime_type NOT LIKE 'text/%')")
		}
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		conditions = append(conditions, fmt.Sprintf(`(
  filename ILIKE $%d OR
  original_name ILIKE $%d OR
  mime_type ILIKE $%d OR
  alt_text ILIKE $%d OR
  url ILIKE $%d
)`, len(args), len(args), len(args), len(args), len(args)))
	}
	return strings.Join(conditions, " AND "), args
}

func normalizeUserFilter(filter models.UserFilter) models.UserFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultUserPageLimit
	}
	if filter.Limit > maxUserPageLimit {
		filter.Limit = maxUserPageLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Role = strings.ToLower(strings.TrimSpace(filter.Role))
	if filter.Role != "admin" && filter.Role != "editor" {
		filter.Role = ""
	}
	filter.Status = strings.ToLower(strings.TrimSpace(filter.Status))
	if filter.Status != "active" && filter.Status != "disabled" {
		filter.Status = ""
	}
	return filter
}

func userListWhere(filter models.UserFilter) (string, []any) {
	filter = normalizeUserFilter(filter)
	args := []any{}
	conditions := []string{"1=1"}
	if filter.Role != "" {
		args = append(args, filter.Role)
		conditions = append(conditions, fmt.Sprintf("role=$%d", len(args)))
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status=$%d", len(args)))
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		conditions = append(conditions, fmt.Sprintf(`(
  username ILIKE $%d OR
  display_name ILIKE $%d
)`, len(args), len(args)))
	}
	return strings.Join(conditions, " AND "), args
}

func (s Store) ListUsers(ctx context.Context, filters ...models.UserFilter) ([]models.User, error) {
	query := `
SELECT id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at
FROM users
ORDER BY created_at ASC`
	args := []any{}
	if len(filters) > 0 {
		filter := normalizeUserFilter(filters[0])
		where, whereArgs := userListWhere(filter)
		args = whereArgs
		args = append(args, filter.Limit, filter.Offset)
		query = fmt.Sprintf(`
SELECT id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at
FROM users
WHERE %s
ORDER BY created_at ASC
LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	}
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s Store) CountUsers(ctx context.Context, filter models.UserFilter) (int, error) {
	where, args := userListWhere(normalizeUserFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT count(*)
FROM users
WHERE %s`, where), args...).Scan(&total)
	return total, err
}

func (s Store) ListUsersPage(ctx context.Context, filter models.UserFilter) (models.PaginatedUsers, error) {
	filter = normalizeUserFilter(filter)
	total, err := s.CountUsers(ctx, filter)
	if err != nil {
		return models.PaginatedUsers{}, err
	}
	users, err := s.ListUsers(ctx, filter)
	if err != nil {
		return models.PaginatedUsers{}, err
	}
	return models.PaginatedUsers{
		Items:  users,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (s Store) CountActiveAdmins(ctx context.Context) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, "SELECT count(*) FROM users WHERE role='admin' AND status='active'").Scan(&count)
	return count, err
}

func (s Store) GetUserByID(ctx context.Context, id string) (models.User, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at
FROM users
WHERE id=$1`, id)
	return scanUser(row)
}

func (s Store) CreateUser(ctx context.Context, input models.UserInput, passwordHash string) (models.User, error) {
	row := s.pool.QueryRow(ctx, `
INSERT INTO users (username, display_name, password_hash, role, status)
VALUES ($1,$2,$3,$4,$5)
RETURNING id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at`,
		strings.TrimSpace(input.Username),
		strings.TrimSpace(input.DisplayName),
		passwordHash,
		normalizeRole(input.Role),
		normalizeUserStatus(input.Status),
	)
	return scanUser(row)
}

func (s Store) UpdateUser(ctx context.Context, id string, input models.UserInput) (models.User, error) {
	nextRole := normalizeRole(input.Role)
	nextStatus := normalizeUserStatus(input.Status)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.User{}, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", userDeleteGuardLockID); err != nil {
		return models.User{}, err
	}

	row := tx.QueryRow(ctx, updateUserSQL(),
		strings.TrimSpace(input.DisplayName),
		nextRole,
		nextStatus,
		id,
	)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			var blocked bool
			if checkErr := tx.QueryRow(ctx, updateUserBlockedByLastAdminGuardSQL(), id, nextRole, nextStatus).Scan(&blocked); checkErr != nil {
				return models.User{}, checkErr
			}
			if blocked {
				return models.User{}, LastActiveAdminError{}
			}
		}
		return models.User{}, err
	}
	return user, tx.Commit(ctx)
}

func updateUserSQL() string {
	return `
UPDATE users
SET display_name=$1,
    role=$2,
    status=$3,
    token_version=CASE
      WHEN role<>$2 OR status<>$3 THEN token_version+1
      ELSE token_version
    END
WHERE id=$4
  AND NOT (
    role='admin'
    AND status='active'
    AND ($2<>'admin' OR $3<>'active')
    AND (SELECT count(*) FROM users WHERE role='admin' AND status='active') <= 1
  )
RETURNING id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at`
}

func updateUserBlockedByLastAdminGuardSQL() string {
	return `
SELECT EXISTS (
  SELECT 1
  FROM users
  WHERE id=$1
    AND role='admin'
    AND status='active'
    AND ($2<>'admin' OR $3<>'active')
    AND (SELECT count(*) FROM users WHERE role='admin' AND status='active') <= 1
)`
}

func (s Store) UpdateUserPassword(ctx context.Context, id, passwordHash string) error {
	tag, err := s.pool.Exec(ctx, "UPDATE users SET password_hash=$1, token_version=token_version+1 WHERE id=$2", passwordHash, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s Store) RevokeUserTokens(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, userTokenRevocationSQL(), id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func userTokenRevocationSQL() string {
	return "UPDATE users SET token_version=token_version+1 WHERE id=$1"
}

func (s Store) DeleteUser(ctx context.Context, id string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", userDeleteGuardLockID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, deleteUserSQL(), id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		var blocked bool
		if err := tx.QueryRow(ctx, deleteUserBlockedByLastAdminGuardSQL(), id).Scan(&blocked); err != nil {
			return err
		}
		if blocked {
			return LastActiveAdminError{}
		}
		return pgx.ErrNoRows
	}
	return tx.Commit(ctx)
}

func deleteUserSQL() string {
	return `
DELETE FROM users
WHERE id=$1
  AND NOT (
    role='admin'
    AND status='active'
    AND (SELECT count(*) FROM users WHERE role='admin' AND status='active') <= 1
  )`
}

func deleteUserBlockedByLastAdminGuardSQL() string {
	return `
SELECT EXISTS (
  SELECT 1
  FROM users
  WHERE id=$1
    AND role='admin'
    AND status='active'
    AND (SELECT count(*) FROM users WHERE role='admin' AND status='active') <= 1
)`
}

func (s Store) SetLastLogin(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, "UPDATE users SET last_login_at=now() WHERE id=$1", id)
	return err
}

func normalizeActivityLogFilter(filter models.ActivityLogFilter) models.ActivityLogFilter {
	if filter.Limit <= 0 {
		filter.Limit = defaultActivityLogPageLimit
	}
	if filter.Limit > maxActivityLogPageLimit {
		filter.Limit = maxActivityLogPageLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	filter.Query = strings.TrimSpace(filter.Query)
	filter.Action = strings.TrimSpace(filter.Action)
	filter.EntityType = strings.TrimSpace(filter.EntityType)
	return filter
}

func activityLogListWhere(filter models.ActivityLogFilter) (string, []any) {
	filter = normalizeActivityLogFilter(filter)
	args := []any{}
	conditions := []string{"1=1"}
	if filter.Action != "" {
		args = append(args, filter.Action)
		conditions = append(conditions, fmt.Sprintf("action=$%d", len(args)))
	}
	if filter.EntityType != "" {
		args = append(args, filter.EntityType)
		conditions = append(conditions, fmt.Sprintf("entity_type=$%d", len(args)))
	}
	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		conditions = append(conditions, fmt.Sprintf(`(
  actor_username ILIKE $%d OR
  entity_id ILIKE $%d OR
  ip_address ILIKE $%d OR
  user_agent ILIKE $%d OR
  detail::text ILIKE $%d
)`, len(args), len(args), len(args), len(args), len(args)))
	}
	return strings.Join(conditions, " AND "), args
}

func (s Store) ListActivityLogs(ctx context.Context, filter models.ActivityLogFilter) ([]models.ActivityLog, error) {
	filter = normalizeActivityLogFilter(filter)
	where, args := activityLogListWhere(filter)
	args = append(args, filter.Limit, filter.Offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
SELECT id::text, COALESCE(actor_id::text, ''), actor_username, action, entity_type, entity_id, detail::text, ip_address, user_agent, created_at
FROM activity_logs
WHERE %s
ORDER BY created_at DESC
LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanActivityLogs(rows)
}

func (s Store) CountActivityLogs(ctx context.Context, filter models.ActivityLogFilter) (int, error) {
	where, args := activityLogListWhere(normalizeActivityLogFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT count(*)
FROM activity_logs
WHERE %s`, where), args...).Scan(&total)
	return total, err
}

func (s Store) ListActivityLogsPage(ctx context.Context, filter models.ActivityLogFilter) (models.PaginatedActivityLogs, error) {
	filter = normalizeActivityLogFilter(filter)
	total, err := s.CountActivityLogs(ctx, filter)
	if err != nil {
		return models.PaginatedActivityLogs{}, err
	}
	logs, err := s.ListActivityLogs(ctx, filter)
	if err != nil {
		return models.PaginatedActivityLogs{}, err
	}
	return models.PaginatedActivityLogs{
		Items:  logs,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func ActivityLogRetentionCutoff(now time.Time, days int) time.Time {
	return now.AddDate(0, 0, -days)
}

func deleteActivityLogsBeforeSQL() string {
	return "DELETE FROM activity_logs WHERE created_at < $1"
}

func (s Store) DeleteActivityLogsBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	tag, err := s.pool.Exec(ctx, deleteActivityLogsBeforeSQL(), cutoff)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func scanActivityLogs(rows pgx.Rows) ([]models.ActivityLog, error) {
	logs := []models.ActivityLog{}
	for rows.Next() {
		var item models.ActivityLog
		var raw string
		if err := rows.Scan(&item.ID, &item.ActorID, &item.ActorUsername, &item.Action, &item.EntityType, &item.EntityID, &raw, &item.IPAddress, &item.UserAgent, &item.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(raw), &item.Detail); err != nil {
			return nil, err
		}
		logs = append(logs, item)
	}
	return logs, rows.Err()
}

func (s Store) CreateActivityLog(ctx context.Context, input models.ActivityLogInput) error {
	if input.Detail == nil {
		input.Detail = map[string]any{}
	}
	raw, err := json.Marshal(input.Detail)
	if err != nil {
		return err
	}
	var actorID any
	if strings.TrimSpace(input.ActorID) != "" {
		actorID = input.ActorID
	}
	_, err = s.pool.Exec(ctx, `
INSERT INTO activity_logs (actor_id, actor_username, action, entity_type, entity_id, detail, ip_address, user_agent)
VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
		actorID,
		strings.TrimSpace(input.ActorUsername),
		strings.TrimSpace(input.Action),
		strings.TrimSpace(input.EntityType),
		strings.TrimSpace(input.EntityID),
		string(raw),
		strings.TrimSpace(input.IPAddress),
		strings.TrimSpace(input.UserAgent),
	)
	return err
}

func (s Store) ListMediaAssets(ctx context.Context, filters ...models.MediaAssetFilter) ([]models.MediaAsset, error) {
	filter := models.MediaAssetFilter{Limit: maxMediaAssetPageLimit}
	if len(filters) > 0 {
		filter = filters[0]
	}
	filter = normalizeMediaAssetFilter(filter)
	where, args := mediaAssetListWhere(filter)
	args = append(args, filter.Limit, filter.Offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`
SELECT id::text, filename, original_name, mime_type, size_bytes, url, alt_text, COALESCE(uploaded_by::text, ''), created_at
FROM media_assets
WHERE %s
ORDER BY created_at DESC
LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	assets := []models.MediaAsset{}
	for rows.Next() {
		asset, err := scanMediaAsset(rows)
		if err != nil {
			return nil, err
		}
		assets = append(assets, asset)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return s.attachMediaReferenceCounts(ctx, assets)
}

func (s Store) CountMediaAssets(ctx context.Context, filter models.MediaAssetFilter) (int, error) {
	where, args := mediaAssetListWhere(normalizeMediaAssetFilter(filter))
	var total int
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
SELECT count(*)
FROM media_assets
WHERE %s`, where), args...).Scan(&total)
	return total, err
}

func (s Store) ListMediaAssetsPage(ctx context.Context, filter models.MediaAssetFilter) (models.PaginatedMediaAssets, error) {
	filter = normalizeMediaAssetFilter(filter)
	total, err := s.CountMediaAssets(ctx, filter)
	if err != nil {
		return models.PaginatedMediaAssets{}, err
	}
	assets, err := s.ListMediaAssets(ctx, filter)
	if err != nil {
		return models.PaginatedMediaAssets{}, err
	}
	return models.PaginatedMediaAssets{
		Items:  assets,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (s Store) CreateMediaAsset(ctx context.Context, input models.MediaAssetInput) (models.MediaAsset, error) {
	row := s.pool.QueryRow(ctx, `
INSERT INTO media_assets (filename, original_name, mime_type, size_bytes, url, alt_text, uploaded_by)
VALUES ($1,$2,$3,$4,$5,$6,$7)
RETURNING id::text, filename, original_name, mime_type, size_bytes, url, alt_text, COALESCE(uploaded_by::text, ''), created_at`,
		input.Filename,
		input.OriginalName,
		input.MimeType,
		input.SizeBytes,
		input.URL,
		input.AltText,
		nullableString(input.UploadedBy),
	)
	return scanMediaAsset(row)
}

func (s Store) GetMediaAssetByID(ctx context.Context, id string) (models.MediaAsset, error) {
	row := s.pool.QueryRow(ctx, `
SELECT id::text, filename, original_name, mime_type, size_bytes, url, alt_text, COALESCE(uploaded_by::text, ''), created_at
FROM media_assets
WHERE id=$1`, id)
	asset, err := scanMediaAsset(row)
	if err != nil {
		return asset, err
	}
	return s.withMediaReferenceCount(ctx, asset)
}

func (s Store) UpdateMediaAssetAltText(ctx context.Context, id, altText string) (models.MediaAsset, error) {
	row := s.pool.QueryRow(ctx, `
UPDATE media_assets
SET alt_text=$1
WHERE id=$2
RETURNING id::text, filename, original_name, mime_type, size_bytes, url, alt_text, COALESCE(uploaded_by::text, ''), created_at`,
		NormalizeMediaAltText(altText),
		id,
	)
	asset, err := scanMediaAsset(row)
	if err != nil {
		return asset, err
	}
	return s.withMediaReferenceCount(ctx, asset)
}

func (s Store) CountMediaAssetReferences(ctx context.Context, asset models.MediaAsset) (int, error) {
	patterns := mediaAssetReferencePatterns(asset)
	if len(patterns) == 0 {
		return 0, nil
	}
	var total int
	if err := s.pool.QueryRow(ctx, mediaAssetReferenceCountSQL(), patterns).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func mediaAssetReferenceCountSQL() string {
	return `
SELECT
  (SELECT count(*) FROM posts p WHERE EXISTS (
    SELECT 1
    FROM unnest($1::text[]) AS pattern(value)
    WHERE p.cover_url=pattern.value OR p.content ILIKE '%' || pattern.value || '%'
  ))
  +
  (SELECT count(*) FROM pages pg WHERE EXISTS (
    SELECT 1
    FROM unnest($1::text[]) AS pattern(value)
    WHERE pg.content ILIKE '%' || pattern.value || '%'
  ))`
}

func (s Store) attachMediaReferenceCounts(ctx context.Context, assets []models.MediaAsset) ([]models.MediaAsset, error) {
	for i := range assets {
		asset, err := s.withMediaReferenceCount(ctx, assets[i])
		if err != nil {
			return nil, err
		}
		assets[i] = asset
	}
	return assets, nil
}

func (s Store) withMediaReferenceCount(ctx context.Context, asset models.MediaAsset) (models.MediaAsset, error) {
	count, err := s.CountMediaAssetReferences(ctx, asset)
	if err != nil {
		return asset, err
	}
	asset.ReferenceCount = count
	return asset, nil
}

func mediaAssetReferencePatterns(asset models.MediaAsset) []string {
	candidates := []string{
		strings.TrimSpace(asset.URL),
	}
	if filename := strings.Trim(strings.ReplaceAll(asset.Filename, "\\", "/"), "/"); filename != "" {
		candidates = append(candidates, "/uploads/"+filename)
	}
	seen := map[string]bool{}
	out := []string{}
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" || seen[candidate] {
			continue
		}
		seen[candidate] = true
		out = append(out, candidate)
	}
	return out
}

func (s Store) DeleteMediaAsset(ctx context.Context, id string) (models.MediaAsset, error) {
	row := s.pool.QueryRow(ctx, deleteMediaAssetSQL(), id)
	asset, err := scanMediaAsset(row)
	if err == nil {
		return asset, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return asset, err
	}
	existing, lookupErr := s.GetMediaAssetByID(ctx, id)
	if errors.Is(lookupErr, pgx.ErrNoRows) {
		return asset, pgx.ErrNoRows
	}
	if lookupErr != nil {
		return asset, lookupErr
	}
	if existing.ReferenceCount > 0 {
		return asset, MediaAssetInUseError{}
	}
	return asset, pgx.ErrNoRows
}

func deleteMediaAssetSQL() string {
	return `
WITH target AS (
  SELECT
    id,
    ARRAY_REMOVE(ARRAY[
      NULLIF(TRIM(url), ''),
      NULLIF('/uploads/' || TRIM(BOTH '/' FROM REPLACE(filename, '\', '/')), '/uploads/')
    ], NULL) AS patterns
  FROM media_assets
  WHERE id=$1
)
DELETE FROM media_assets m
USING target t
WHERE m.id=t.id
  AND NOT EXISTS (
    SELECT 1
    FROM posts p, unnest(t.patterns) AS pattern(value)
    WHERE p.cover_url=pattern.value OR p.content ILIKE '%' || pattern.value || '%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pages pg, unnest(t.patterns) AS pattern(value)
    WHERE pg.content ILIKE '%' || pattern.value || '%'
  )
RETURNING m.id::text, m.filename, m.original_name, m.mime_type, m.size_bytes, m.url, m.alt_text, COALESCE(m.uploaded_by::text, ''), m.created_at`
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func scanUser(row rowScanner) (models.User, error) {
	var user models.User
	var lastLoginAt sql.NullTime
	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.DisplayName,
		&user.PasswordHash,
		&user.Role,
		&user.Status,
		&user.TokenVersion,
		&lastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return user, err
	}
	if lastLoginAt.Valid {
		value := lastLoginAt.Time
		user.LastLoginAt = &value
	}
	return user, nil
}

func scanMediaAsset(row rowScanner) (models.MediaAsset, error) {
	var asset models.MediaAsset
	err := row.Scan(
		&asset.ID,
		&asset.Filename,
		&asset.OriginalName,
		&asset.MimeType,
		&asset.SizeBytes,
		&asset.URL,
		&asset.AltText,
		&asset.UploadedBy,
		&asset.CreatedAt,
	)
	return asset, err
}
