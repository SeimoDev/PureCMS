package store

import (
	"context"
	"errors"
	"net/url"
	"strconv"
	"strings"

	"purecms/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func NormalizeFriendLinkInput(input models.FriendLinkInput) (models.FriendLinkInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.URL = normalizeURL(strings.TrimSpace(input.URL))
	input.Description = strings.TrimSpace(input.Description)
	input.LogoURL = strings.TrimSpace(input.LogoURL)
	input.Status = normalizeFriendLinkStatus(input.Status)

	if input.Name == "" {
		return input, errors.New("friend link name is required")
	}
	if !validWebURL(input.URL) {
		return input, errors.New("friend link url must be http or https")
	}
	if input.LogoURL != "" {
		input.LogoURL = normalizeURL(input.LogoURL)
		if !validWebURL(input.LogoURL) {
			return input, errors.New("friend link logo url must be http or https")
		}
	}
	return input, nil
}

func normalizeFriendLinkStatus(status string) string {
	if strings.TrimSpace(status) == "hidden" {
		return "hidden"
	}
	return "active"
}

func normalizeURL(value string) string {
	if value == "" {
		return value
	}
	if strings.Contains(value, "://") || strings.HasPrefix(value, "//") || looksLikeURLScheme(value) {
		return value
	}
	return "https://" + value
}

func looksLikeURLScheme(value string) bool {
	colon := strings.Index(value, ":")
	if colon <= 0 {
		return false
	}
	if boundary := strings.IndexAny(value, "/?#"); boundary >= 0 && boundary < colon {
		return false
	}
	if looksLikeHostPort(value) {
		return false
	}
	for index, char := range value[:colon] {
		if index == 0 {
			if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') {
				return false
			}
			continue
		}
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '+' || char == '-' || char == '.' {
			continue
		}
		return false
	}
	return true
}

func looksLikeHostPort(value string) bool {
	hostPort := value
	if boundary := strings.IndexAny(hostPort, "/?#"); boundary >= 0 {
		hostPort = hostPort[:boundary]
	}
	colon := strings.LastIndex(hostPort, ":")
	if colon <= 0 || colon == len(hostPort)-1 {
		return false
	}
	host := hostPort[:colon]
	port := hostPort[colon+1:]
	if strings.Contains(host, "@") {
		return false
	}
	for _, char := range port {
		if char < '0' || char > '9' {
			return false
		}
	}
	return strings.Contains(host, ".") || strings.EqualFold(host, "localhost")
}

func validWebURL(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil {
		return false
	}
	if parsed.User != nil || parsed.Hostname() == "" {
		return false
	}
	if parsed.Port() != "" {
		port, err := strconv.Atoi(parsed.Port())
		if err != nil || port < 1 || port > 65535 {
			return false
		}
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func (s Store) ListFriendLinks(ctx context.Context, admin bool) ([]models.FriendLink, error) {
	condition := "status='active'"
	if admin {
		condition = "1=1"
	}
	rows, err := s.pool.Query(ctx, `
SELECT id::text, name, url, description, logo_url, status, sort_order, created_at, updated_at
FROM friend_links
WHERE `+condition+`
ORDER BY sort_order ASC, name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	links := []models.FriendLink{}
	for rows.Next() {
		link, err := scanFriendLink(rows)
		if err != nil {
			return nil, err
		}
		links = append(links, link)
	}
	return links, rows.Err()
}

func (s Store) CreateFriendLink(ctx context.Context, input models.FriendLinkInput) (models.FriendLink, error) {
	normalized, err := NormalizeFriendLinkInput(input)
	if err != nil {
		return models.FriendLink{}, err
	}
	row := s.pool.QueryRow(ctx, `
INSERT INTO friend_links (name, url, description, logo_url, status, sort_order)
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING id::text, name, url, description, logo_url, status, sort_order, created_at, updated_at`,
		normalized.Name,
		normalized.URL,
		normalized.Description,
		normalized.LogoURL,
		normalized.Status,
		normalized.SortOrder,
	)
	return scanFriendLink(row)
}

func (s Store) UpdateFriendLink(ctx context.Context, id string, input models.FriendLinkInput) (models.FriendLink, error) {
	normalized, err := NormalizeFriendLinkInput(input)
	if err != nil {
		return models.FriendLink{}, err
	}
	row := s.pool.QueryRow(ctx, `
UPDATE friend_links
SET name=$1, url=$2, description=$3, logo_url=$4, status=$5, sort_order=$6
WHERE id=$7
RETURNING id::text, name, url, description, logo_url, status, sort_order, created_at, updated_at`,
		normalized.Name,
		normalized.URL,
		normalized.Description,
		normalized.LogoURL,
		normalized.Status,
		normalized.SortOrder,
		id,
	)
	return scanFriendLink(row)
}

func (s Store) DeleteFriendLink(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM friend_links WHERE id=$1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func scanFriendLink(row rowScanner) (models.FriendLink, error) {
	var link models.FriendLink
	err := row.Scan(
		&link.ID,
		&link.Name,
		&link.URL,
		&link.Description,
		&link.LogoURL,
		&link.Status,
		&link.SortOrder,
		&link.CreatedAt,
		&link.UpdatedAt,
	)
	return link, err
}
