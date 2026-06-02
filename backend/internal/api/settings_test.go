package api

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestPublicSiteSettingsRedactsAdminOnlyCommentPolicy(t *testing.T) {
	input := map[string]any{
		"site":       map[string]any{"title": "站点名称"},
		"seo":        map[string]any{"description": "站点描述"},
		"appearance": map[string]any{"themeMode": "dark"},
		"comment": map[string]any{
			"enabled":                false,
			"notice":                 "请理性交流",
			"moderation":             false,
			"spamKeywords":           []any{"广告", "外链"},
			"rateLimitWindowMinutes": 3.0,
			"rateLimitMax":           2.0,
		},
		"translation": map[string]any{
			"enabled":        true,
			"provider":       "openai-compatible",
			"endpoint":       "https://api.example.test/v1/chat/completions",
			"model":          "gpt-test",
			"apiKey":         "secret-key",
			"timeoutSeconds": 30.0,
		},
		"maintenance": map[string]any{
			"enabled":      true,
			"message":      "maintenance window",
			"internalNote": "deploy ticket",
		},
		"internal": map[string]any{"secret": "value"},
	}

	got := publicSiteSettings(input)
	if _, ok := got["internal"]; ok {
		t.Fatalf("public settings exposed internal section: %+v", got)
	}
	if _, ok := got["site"]; !ok {
		t.Fatalf("public settings missing site section: %+v", got)
	}
	if _, ok := got["seo"]; !ok {
		t.Fatalf("public settings missing seo section: %+v", got)
	}
	if _, ok := got["appearance"]; !ok {
		t.Fatalf("public settings missing appearance section: %+v", got)
	}

	comment, ok := got["comment"].(map[string]any)
	if !ok {
		t.Fatalf("comment = %#v, want public comment map", got["comment"])
	}
	if comment["enabled"] != false || comment["notice"] != "请理性交流" {
		t.Fatalf("comment = %+v, want enabled and notice preserved", comment)
	}
	for _, key := range []string{"moderation", "spamKeywords", "rateLimitWindowMinutes", "rateLimitMax"} {
		if _, ok := comment[key]; ok {
			t.Fatalf("public comment settings exposed %q: %+v", key, comment)
		}
	}

	translation, ok := got["translation"].(map[string]any)
	if !ok {
		t.Fatalf("translation = %#v, want public translation map", got["translation"])
	}
	if translation["enabled"] != true || translation["model"] != "gpt-test" {
		t.Fatalf("translation = %+v, want enabled and model preserved", translation)
	}
	for _, key := range []string{"apiKey", "endpoint", "timeoutSeconds"} {
		if _, ok := translation[key]; ok {
			t.Fatalf("public translation settings exposed %q: %+v", key, translation)
		}
	}

	maintenance, ok := got["maintenance"].(map[string]any)
	if !ok {
		t.Fatalf("maintenance = %#v, want public maintenance map", got["maintenance"])
	}
	if maintenance["enabled"] != true || maintenance["message"] != "maintenance window" {
		t.Fatalf("maintenance = %+v, want enabled and message preserved", maintenance)
	}
	if _, ok := maintenance["internalNote"]; ok {
		t.Fatalf("public maintenance settings exposed internal note: %+v", maintenance)
	}
}

func TestPublicSiteSettingsDoesNotMutateSource(t *testing.T) {
	input := map[string]any{
		"comment": map[string]any{
			"enabled":      true,
			"spamKeywords": []any{"广告"},
		},
	}

	_ = publicSiteSettings(input)
	comment := input["comment"].(map[string]any)
	if _, ok := comment["spamKeywords"]; !ok {
		t.Fatalf("source comment settings were mutated: %+v", comment)
	}
}

func TestPublicMaintenanceEnabled(t *testing.T) {
	if publicMaintenanceEnabled(map[string]any{}) {
		t.Fatal("missing maintenance settings should not enable maintenance mode")
	}
	if publicMaintenanceEnabled(map[string]any{"maintenance": map[string]any{"enabled": false}}) {
		t.Fatal("disabled maintenance setting should not enable maintenance mode")
	}
	if !publicMaintenanceEnabled(map[string]any{"maintenance": map[string]any{"enabled": true}}) {
		t.Fatal("enabled maintenance setting should enable maintenance mode")
	}
}

func TestPublicMaintenanceErrorMessageUsesConfiguredMessage(t *testing.T) {
	if got := publicMaintenanceErrorMessage(map[string]any{}); got != "site under maintenance" {
		t.Fatalf("missing maintenance message = %q, want default", got)
	}
	if got := publicMaintenanceErrorMessage(map[string]any{"maintenance": map[string]any{"message": "   "}}); got != "site under maintenance" {
		t.Fatalf("blank maintenance message = %q, want default", got)
	}
	if got := publicMaintenanceErrorMessage(map[string]any{"maintenance": map[string]any{"message": "  系统升级中，请稍后再试  "}}); got != "系统升级中，请稍后再试" {
		t.Fatalf("configured maintenance message = %q, want trimmed custom message", got)
	}
}

func TestPublicMaintenanceGateUsesConfiguredErrorMessage(t *testing.T) {
	source := readAPISource(t, "server.go")
	body := handlerSource(t, source, "publicMaintenanceGate")
	if !strings.Contains(body, "publicMaintenanceErrorMessage(settings)") {
		t.Fatalf("publicMaintenanceGate should use configured maintenance error message:\n%s", body)
	}
	if strings.Contains(body, "\"site under maintenance\"") {
		t.Fatalf("publicMaintenanceGate should not hard-code maintenance error text:\n%s", body)
	}
}

func TestSettingsUpdateLogDetailSummarizesCriticalSettingsWithoutSecrets(t *testing.T) {
	got := settingsUpdateLogDetail(map[string]any{
		"translation": map[string]any{
			"enabled":        true,
			"provider":       "openai-compatible",
			"endpoint":       "https://internal.example.test/v1/chat/completions",
			"model":          "gpt-test",
			"apiKey":         "secret-key",
			"timeoutSeconds": 45.0,
		},
		"comment": map[string]any{
			"enabled":                false,
			"moderation":             true,
			"spamKeywords":           []any{"广告", "外链"},
			"rateLimitWindowMinutes": 10.0,
			"rateLimitMax":           5.0,
		},
		"site": map[string]any{
			"icp":             "京ICP备00000000号",
			"icpUrl":          "https://beian.miit.gov.cn/",
			"policeRecord":    "",
			"policeRecordUrl": "",
			"email":           "admin@example.test",
		},
		"maintenance": map[string]any{
			"enabled": true,
			"message": "升级中",
		},
	})

	if got["sectionCount"] != 4 {
		t.Fatalf("sectionCount = %v, want 4", got["sectionCount"])
	}
	sections, ok := got["sections"].([]string)
	if !ok {
		t.Fatalf("sections = %#v, want []string", got["sections"])
	}
	if strings.Join(sections, ",") != "comment,maintenance,site,translation" {
		t.Fatalf("sections = %v, want stable sorted sections", sections)
	}
	for key, want := range map[string]any{
		"commentsEnabled":               false,
		"commentModeration":             true,
		"commentSpamKeywordCount":       2,
		"commentRateLimitWindowMinutes": 10,
		"commentRateLimitMax":           5,
		"translationEnabled":            true,
		"translationProvider":           "openai-compatible",
		"translationModel":              "gpt-test",
		"translationAPIKeyConfigured":   true,
		"translationTimeoutSeconds":     45,
		"icpConfigured":                 true,
		"icpURLConfigured":              true,
		"policeRecordConfigured":        false,
		"policeRecordURLConfigured":     false,
		"publicContactConfigured":       true,
		"maintenanceEnabled":            true,
		"maintenanceMessageConfigured":  true,
	} {
		if got[key] != want {
			t.Fatalf("%s = %#v, want %#v in detail %+v", key, got[key], want, got)
		}
	}

	raw, err := json.Marshal(got)
	if err != nil {
		t.Fatalf("marshal settings update detail: %v", err)
	}
	for _, leaked := range []string{"secret-key", "apiKey", "endpoint", "internal.example.test", "升级中"} {
		if strings.Contains(string(raw), leaked) {
			t.Fatalf("settings update detail leaked %q: %s", leaked, string(raw))
		}
	}
}

func TestSettingsTranslationBackfillConfigRequiresRunnableTranslationSection(t *testing.T) {
	settings := map[string]any{
		"translation": map[string]any{
			"enabled":  true,
			"provider": "openai-compatible",
			"endpoint": "https://api.example.test/v1/chat/completions",
			"model":    "gpt-test",
			"apiKey":   "secret-key",
		},
	}

	cfg, ok := settingsTranslationBackfillConfig(map[string]any{
		"translation": map[string]any{"enabled": true},
	}, settings)
	if !ok {
		t.Fatal("runnable translation settings should trigger published post backfill")
	}
	if cfg.Model != "gpt-test" || cfg.APIKey != "secret-key" {
		t.Fatalf("translation config = %+v, want saved runnable settings", cfg)
	}

	if _, ok := settingsTranslationBackfillConfig(map[string]any{
		"site": map[string]any{"title": "CMS"},
	}, settings); ok {
		t.Fatal("non-translation settings update should not trigger translation backfill")
	}

	disabled := map[string]any{
		"translation": map[string]any{"enabled": false, "model": "gpt-test", "endpoint": "https://api.example.test/v1/chat/completions", "apiKey": "secret-key"},
	}
	if _, ok := settingsTranslationBackfillConfig(map[string]any{
		"translation": map[string]any{"enabled": false},
	}, disabled); ok {
		t.Fatal("disabled translation settings should not trigger translation backfill")
	}
}

func TestValidateSettingsUpdateAllowsDisabledTranslationWithoutKey(t *testing.T) {
	err := validateSettingsUpdate(map[string]any{
		"translation": map[string]any{
			"enabled":  false,
			"apiKey":   "",
			"endpoint": "ftp://example.test/translate",
		},
	})

	if err != nil {
		t.Fatalf("validateSettingsUpdate returned error for disabled translation: %v", err)
	}
}

func TestValidateSettingsUpdateValidatesComplianceURLs(t *testing.T) {
	err := validateSettingsUpdate(map[string]any{
		"site": map[string]any{
			"icpUrl":          "https://beian.miit.gov.cn/",
			"policeRecordUrl": "https://www.beian.gov.cn/portal/registerSystemInfo",
		},
	})
	if err != nil {
		t.Fatalf("validateSettingsUpdate returned error for compliance URLs: %v", err)
	}

	err = validateSettingsUpdate(map[string]any{
		"site": map[string]any{
			"icpUrl": "javascript:alert(1)",
		},
	})
	if !errors.Is(err, errInvalidSettings) {
		t.Fatalf("validateSettingsUpdate error = %v, want invalid settings for unsafe compliance URL", err)
	}
}

func TestValidateSettingsUpdateRejectsEnabledTranslationWithoutAPIKey(t *testing.T) {
	err := validateSettingsUpdate(map[string]any{
		"translation": map[string]any{
			"enabled":  true,
			"endpoint": "https://api.example.test/v1/chat/completions",
			"model":    "gpt-test",
		},
	})

	if !errors.Is(err, errInvalidSettings) {
		t.Fatalf("validateSettingsUpdate error = %v, want invalid settings", err)
	}
}

func TestValidateSettingsUpdateRejectsEnabledTranslationNonHTTPEndpoint(t *testing.T) {
	err := validateSettingsUpdate(map[string]any{
		"translation": map[string]any{
			"enabled":  true,
			"apiKey":   "secret",
			"endpoint": "ftp://api.example.test/translate",
			"model":    "gpt-test",
		},
	})

	if !errors.Is(err, errInvalidSettings) {
		t.Fatalf("validateSettingsUpdate error = %v, want invalid settings", err)
	}
}

func TestValidateSettingsUpdateAcceptsRunnableTranslationSettings(t *testing.T) {
	err := validateSettingsUpdate(map[string]any{
		"translation": map[string]any{
			"enabled":  true,
			"apiKey":   "secret",
			"endpoint": "https://api.example.test/v1/chat/completions",
			"model":    "gpt-test",
		},
	})

	if err != nil {
		t.Fatalf("validateSettingsUpdate returned error: %v", err)
	}
}
