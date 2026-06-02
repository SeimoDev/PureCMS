package i18n

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var ErrTranslationUnavailable = errors.New("ai translation is not configured")

type TranslationSettings struct {
	Enabled        bool
	Provider       string
	Endpoint       string
	APIKey         string
	Model          string
	TimeoutSeconds int
}

func TranslationSettingsFrom(settings map[string]any) TranslationSettings {
	out := TranslationSettings{
		Provider:       "openai-compatible",
		Endpoint:       "https://api.openai.com/v1/chat/completions",
		Model:          "gpt-4o-mini",
		TimeoutSeconds: 30,
	}
	value, _ := settings["translation"].(map[string]any)
	if enabled, ok := value["enabled"].(bool); ok {
		out.Enabled = enabled
	}
	if provider, ok := stringSetting(value["provider"]); ok {
		out.Provider = provider
	}
	if endpoint, ok := stringSetting(value["endpoint"]); ok {
		out.Endpoint = endpoint
	}
	if apiKey, ok := stringSetting(value["apiKey"]); ok {
		out.APIKey = apiKey
	}
	if model, ok := stringSetting(value["model"]); ok {
		out.Model = model
	}
	if timeout, ok := intSetting(value["timeoutSeconds"]); ok {
		if timeout < 5 {
			timeout = 5
		}
		if timeout > 120 {
			timeout = 120
		}
		out.TimeoutSeconds = timeout
	}
	return out
}

func PublicTranslationSettings(settings map[string]any) map[string]any {
	cfg := TranslationSettingsFrom(settings)
	return map[string]any{
		"enabled":  cfg.Enabled,
		"provider": cfg.Provider,
		"model":    cfg.Model,
	}
}

type Translator struct {
	Client *http.Client
}

func (t Translator) TranslateSegment(ctx context.Context, cfg TranslationSettings, sourceLanguage, targetLanguage, text string) (string, error) {
	if !cfg.Enabled || strings.TrimSpace(cfg.APIKey) == "" || strings.TrimSpace(cfg.Endpoint) == "" || strings.TrimSpace(cfg.Model) == "" {
		return "", ErrTranslationUnavailable
	}
	client := t.Client
	if client == nil {
		client = http.DefaultClient
	}
	timeout := time.Duration(cfg.TimeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	source := LanguageByCode(sourceLanguage)
	target := LanguageByCode(targetLanguage)
	body := chatCompletionRequest{
		Model: cfg.Model,
		Messages: []chatMessage{
			{
				Role:    "system",
				Content: "You translate Markdown for a personal blog. Preserve Markdown syntax, code fences, URLs, image links, tables, and line breaks. Return only the translated text.",
			},
			{
				Role:    "user",
				Content: fmt.Sprintf("Translate from %s to %s.\n\n%s", source.NativeName, target.NativeName, text),
			},
		},
		Temperature: 0.2,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.Endpoint, bytes.NewReader(raw))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(cfg.APIKey))
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("translation provider returned %s", resp.Status)
	}
	var parsed chatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("translation provider returned no choices")
	}
	translated := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if translated == "" {
		return "", errors.New("translation provider returned empty content")
	}
	return translated, nil
}

type chatCompletionRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

func stringSetting(value any) (string, bool) {
	text, ok := value.(string)
	if !ok {
		return "", false
	}
	text = strings.TrimSpace(text)
	return text, text != ""
}

func intSetting(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case float64:
		return int(typed), true
	case json.Number:
		parsed, err := typed.Int64()
		return int(parsed), err == nil
	default:
		return 0, false
	}
}
