package api

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestDecodeJSONKeepsSmallGenericBodyLimit(t *testing.T) {
	body := `{"displayName":"` + strings.Repeat("a", int(maxJSONBodyBytes)+1024) + `"}`
	req := jsonRequest("PUT", "/api/admin/me/profile", body)
	rec := httptest.NewRecorder()
	var input models.AccountProfileInput

	if decodeJSON(rec, req, &input) {
		t.Fatal("decodeJSON accepted oversized generic request")
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestDecodeJSONAllowsTrailingWhitespace(t *testing.T) {
	req := jsonRequest("PUT", "/api/admin/me/profile", "{\"displayName\":\"admin\"}\n\t ")
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	rec := httptest.NewRecorder()
	var input models.AccountProfileInput

	if !decodeJSON(rec, req, &input) {
		t.Fatalf("decodeJSON rejected valid JSON with whitespace: status=%d body=%s", rec.Code, rec.Body.String())
	}
	if input.DisplayName != "admin" {
		t.Fatalf("DisplayName = %q, want admin", input.DisplayName)
	}
}

func TestDecodeJSONRejectsTrailingJSONValue(t *testing.T) {
	req := jsonRequest("PUT", "/api/admin/me/profile", `{"displayName":"admin"}{"displayName":"attacker"}`)
	rec := httptest.NewRecorder()
	var input models.AccountProfileInput

	if decodeJSON(rec, req, &input) {
		t.Fatal("decodeJSON accepted request with a second JSON value")
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestDecodeJSONRejectsMissingContentType(t *testing.T) {
	req := httptest.NewRequest("PUT", "/api/admin/me/profile", strings.NewReader(`{"displayName":"admin"}`))
	rec := httptest.NewRecorder()
	var input models.AccountProfileInput

	if decodeJSON(rec, req, &input) {
		t.Fatal("decodeJSON accepted request without Content-Type")
	}
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, want 415", rec.Code)
	}
}

func TestDecodeJSONRejectsNonJSONContentType(t *testing.T) {
	req := httptest.NewRequest("PUT", "/api/admin/me/profile", strings.NewReader(`{"displayName":"admin"}`))
	req.Header.Set("Content-Type", "text/plain")
	rec := httptest.NewRecorder()
	var input models.AccountProfileInput

	if decodeJSON(rec, req, &input) {
		t.Fatal("decodeJSON accepted text/plain request")
	}
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, want 415", rec.Code)
	}
}

func TestDecodeBackupSnapshotAllowsLargeBackup(t *testing.T) {
	largeTitle := strings.Repeat("a", int(maxJSONBodyBytes)+1024)
	body := `{"settings":{"site":{"title":"` + largeTitle + `"}}}`
	req := jsonRequest("POST", "/api/admin/backup/import", body)
	rec := httptest.NewRecorder()
	var snapshot models.BackupSnapshot

	if !decodeBackupSnapshot(rec, req, &snapshot) {
		t.Fatalf("decodeBackupSnapshot rejected backup larger than generic limit: status=%d body=%s", rec.Code, rec.Body.String())
	}
	site, ok := snapshot.Settings["site"].(map[string]any)
	if !ok {
		t.Fatalf("site settings = %#v, want map", snapshot.Settings["site"])
	}
	if site["title"] != largeTitle {
		t.Fatal("large backup title was not decoded intact")
	}
}

func TestDecodeBackupSnapshotRejectsTrailingJSONValue(t *testing.T) {
	req := jsonRequest("POST", "/api/admin/backup/import", `{"settings":{"site":{"title":"A"}}}{"settings":{"site":{"title":"B"}}}`)
	rec := httptest.NewRecorder()
	var snapshot models.BackupSnapshot

	if decodeBackupSnapshot(rec, req, &snapshot) {
		t.Fatal("decodeBackupSnapshot accepted request with a second JSON value")
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestValidateBackupSnapshotRejectsEmptyBackup(t *testing.T) {
	if err := validateBackupSnapshot(models.BackupSnapshot{}); !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v, want invalid backup", err)
	}
}

func TestValidateBackupSnapshotRejectsBlankSettingKey(t *testing.T) {
	err := validateBackupSnapshot(models.BackupSnapshot{
		Settings: map[string]any{" ": map[string]any{"title": "CMS"}},
	})

	if !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v, want invalid backup", err)
	}
}

func TestValidateBackupSnapshotRejectsBlankBackupUsername(t *testing.T) {
	err := validateBackupSnapshot(models.BackupSnapshot{
		Users: []models.BackupUser{{Username: " ", DisplayName: "Ghost"}},
	})

	if !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v, want invalid backup", err)
	}
}

func TestValidateBackupSnapshotRejectsBlankPostIdentity(t *testing.T) {
	for _, post := range []models.Post{
		{Title: " ", Slug: "valid-slug"},
		{Title: "Valid title", Slug: " "},
	} {
		err := validateBackupSnapshot(models.BackupSnapshot{Posts: []models.Post{post}})

		if !errors.Is(err, errInvalidBackupSnapshot) {
			t.Fatalf("validateBackupSnapshot error = %v for post %+v, want invalid backup", err, post)
		}
	}
}

func TestValidateBackupSnapshotRejectsBlankPageIdentity(t *testing.T) {
	for _, page := range []models.Page{
		{Title: " ", Slug: "about"},
		{Title: "About", Slug: " "},
	} {
		err := validateBackupSnapshot(models.BackupSnapshot{Pages: []models.Page{page}})

		if !errors.Is(err, errInvalidBackupSnapshot) {
			t.Fatalf("validateBackupSnapshot error = %v for page %+v, want invalid backup", err, page)
		}
	}
}

func TestValidateBackupSnapshotRejectsBlankTaxonomyIdentity(t *testing.T) {
	err := validateBackupSnapshot(models.BackupSnapshot{
		Categories: []models.Category{{Name: " ", Slug: "tech"}},
	})
	if !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v for blank category name, want invalid backup", err)
	}

	err = validateBackupSnapshot(models.BackupSnapshot{
		Categories: []models.Category{{Name: "Tech", Slug: " "}},
	})
	if !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v for blank category slug, want invalid backup", err)
	}

	err = validateBackupSnapshot(models.BackupSnapshot{
		Tags: []models.Tag{{Name: " ", Slug: "go"}},
	})
	if !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v for blank tag name, want invalid backup", err)
	}

	err = validateBackupSnapshot(models.BackupSnapshot{
		Tags: []models.Tag{{Name: "Go", Slug: " "}},
	})
	if !errors.Is(err, errInvalidBackupSnapshot) {
		t.Fatalf("validateBackupSnapshot error = %v for blank tag slug, want invalid backup", err)
	}
}

func TestValidateBackupSnapshotRejectsBlankFriendLinkIdentity(t *testing.T) {
	for _, link := range []models.FriendLink{
		{Name: " ", URL: "https://example.com"},
		{Name: "Example", URL: " "},
	} {
		err := validateBackupSnapshot(models.BackupSnapshot{FriendLinks: []models.FriendLink{link}})

		if !errors.Is(err, errInvalidBackupSnapshot) {
			t.Fatalf("validateBackupSnapshot error = %v for friend link %+v, want invalid backup", err, link)
		}
	}
}

func TestValidateBackupSnapshotRejectsBlankMediaAssetIdentity(t *testing.T) {
	asset := models.MediaAsset{
		Filename:     "2026/06/a.png",
		OriginalName: "a.png",
		MimeType:     "image/png",
		URL:          "/uploads/2026/06/a.png",
	}
	cases := []models.MediaAsset{
		{Filename: " ", OriginalName: asset.OriginalName, MimeType: asset.MimeType, URL: asset.URL},
		{Filename: asset.Filename, OriginalName: " ", MimeType: asset.MimeType, URL: asset.URL},
		{Filename: asset.Filename, OriginalName: asset.OriginalName, MimeType: " ", URL: asset.URL},
		{Filename: asset.Filename, OriginalName: asset.OriginalName, MimeType: asset.MimeType, URL: " "},
	}
	for _, invalid := range cases {
		err := validateBackupSnapshot(models.BackupSnapshot{MediaAssets: []models.MediaAsset{invalid}})

		if !errors.Is(err, errInvalidBackupSnapshot) {
			t.Fatalf("validateBackupSnapshot error = %v for media asset %+v, want invalid backup", err, invalid)
		}
	}
}

func TestValidateBackupSnapshotAcceptsSettingsOnlyBackup(t *testing.T) {
	err := validateBackupSnapshot(models.BackupSnapshot{
		Settings: map[string]any{"site": map[string]any{"title": "CMS"}},
	})

	if err != nil {
		t.Fatalf("validateBackupSnapshot returned error: %v", err)
	}
}

func TestValidateBackupSnapshotAcceptsTranslationJobsOnlyBackup(t *testing.T) {
	err := validateBackupSnapshot(models.BackupSnapshot{
		PostTranslationJobs: []models.PostTranslationJob{{
			PostID:       "post-1",
			LanguageCode: "en",
			SourceHash:   "hash",
			Status:       "failed",
		}},
	})

	if err != nil {
		t.Fatalf("validateBackupSnapshot returned error: %v", err)
	}
}

func jsonRequest(method, target, body string) *http.Request {
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req
}
