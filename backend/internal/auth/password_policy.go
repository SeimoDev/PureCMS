package auth

import (
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"
)

var ErrWeakPassword = errors.New("weak password")

const MinPasswordRunes = 10

func ValidatePasswordPolicy(password string) error {
	value := strings.TrimSpace(password)
	if utf8.RuneCountInString(value) < MinPasswordRunes {
		return ErrWeakPassword
	}
	var hasLower bool
	var hasUpper bool
	var hasDigit bool
	for _, r := range value {
		if unicode.IsLower(r) {
			hasLower = true
		}
		if unicode.IsUpper(r) {
			hasUpper = true
		}
		if unicode.IsDigit(r) {
			hasDigit = true
		}
	}
	if !hasLower || !hasUpper || !hasDigit {
		return ErrWeakPassword
	}
	return nil
}

func PasswordPolicyMessage() string {
	return "密码至少 10 位，并包含大写字母、小写字母和数字"
}
