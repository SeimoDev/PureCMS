package i18n

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

const DefaultLanguageCode = "zh-CN"

type Language struct {
	Code       string `json:"code"`
	Flag       string `json:"flag"`
	NativeName string `json:"nativeName"`
	RTL        bool   `json:"rtl"`
}

var SupportedLanguages = []Language{
	{Code: "zh-CN", Flag: "🇨🇳", NativeName: "简体中文"},
	{Code: "zh-TW", Flag: "🇹🇼", NativeName: "繁體中文"},
	{Code: "en", Flag: "🇺🇸", NativeName: "English"},
	{Code: "ja", Flag: "🇯🇵", NativeName: "日本語"},
	{Code: "fr", Flag: "🇫🇷", NativeName: "Français"},
	{Code: "hi", Flag: "🇮🇳", NativeName: "हिन्दी"},
	{Code: "es", Flag: "🇪🇸", NativeName: "Español"},
	{Code: "ar", Flag: "🇸🇦", NativeName: "العربية", RTL: true},
	{Code: "ru", Flag: "🇷🇺", NativeName: "Русский"},
	{Code: "pt", Flag: "🇵🇹", NativeName: "Português"},
	{Code: "eo", Flag: "🌍", NativeName: "Esperanto"},
}

var languageByCode = func() map[string]Language {
	out := map[string]Language{}
	for _, language := range SupportedLanguages {
		out[strings.ToLower(language.Code)] = language
	}
	return out
}()

func NormalizeLanguageCode(value string) string {
	normalized := strings.TrimSpace(strings.ReplaceAll(value, "_", "-"))
	if normalized == "" {
		return DefaultLanguageCode
	}
	normalized = strings.ToLower(normalized)
	switch {
	case normalized == "zh" || strings.HasPrefix(normalized, "zh-cn") || strings.HasPrefix(normalized, "zh-hans"):
		return "zh-CN"
	case strings.HasPrefix(normalized, "zh-tw") || strings.HasPrefix(normalized, "zh-hk") || strings.HasPrefix(normalized, "zh-hant"):
		return "zh-TW"
	case strings.HasPrefix(normalized, "en"):
		return "en"
	case strings.HasPrefix(normalized, "ja"):
		return "ja"
	case strings.HasPrefix(normalized, "fr"):
		return "fr"
	case strings.HasPrefix(normalized, "hi"):
		return "hi"
	case strings.HasPrefix(normalized, "es"):
		return "es"
	case strings.HasPrefix(normalized, "ar"):
		return "ar"
	case strings.HasPrefix(normalized, "ru"):
		return "ru"
	case strings.HasPrefix(normalized, "pt"):
		return "pt"
	case strings.HasPrefix(normalized, "eo"):
		return "eo"
	default:
		return DefaultLanguageCode
	}
}

func IsSupportedLanguage(value string) bool {
	_, ok := languageByCode[strings.ToLower(NormalizeLanguageCode(value))]
	return ok
}

func LanguageByCode(value string) Language {
	code := NormalizeLanguageCode(value)
	if language, ok := languageByCode[strings.ToLower(code)]; ok {
		return language
	}
	return SupportedLanguages[0]
}

func SourceHash(sourceLanguage, title, excerpt, content string) string {
	hash := sha256.Sum256([]byte(strings.Join([]string{
		NormalizeLanguageCode(sourceLanguage),
		strings.TrimSpace(title),
		strings.TrimSpace(excerpt),
		content,
	}, "\x00")))
	return hex.EncodeToString(hash[:])
}

func SplitMarkdownSegments(content string) []string {
	normalized := strings.ReplaceAll(content, "\r\n", "\n")
	blocks := strings.Split(normalized, "\n\n")
	segments := make([]string, 0, len(blocks))
	for _, block := range blocks {
		segment := strings.Trim(block, "\n")
		if strings.TrimSpace(segment) == "" {
			continue
		}
		segments = append(segments, segment)
	}
	if len(segments) == 0 && strings.TrimSpace(content) != "" {
		return []string{strings.Trim(content, "\n")}
	}
	return segments
}
