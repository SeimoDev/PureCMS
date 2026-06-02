package store

import (
	"context"
	"errors"
	"strings"

	"purecms/backend/internal/models"
)

func NormalizeAccountProfileInput(input models.AccountProfileInput) (models.AccountProfileInput, error) {
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	if input.DisplayName == "" {
		return input, errors.New("display name is required")
	}
	return input, nil
}

func (s Store) UpdateAccountProfile(ctx context.Context, id string, input models.AccountProfileInput) (models.User, error) {
	normalized, err := NormalizeAccountProfileInput(input)
	if err != nil {
		return models.User{}, err
	}
	row := s.pool.QueryRow(ctx, `
UPDATE users
SET display_name=$1
WHERE id=$2
RETURNING id::text, username, display_name, password_hash, role, status, token_version, last_login_at, created_at, updated_at`,
		normalized.DisplayName,
		id,
	)
	return scanUser(row)
}
