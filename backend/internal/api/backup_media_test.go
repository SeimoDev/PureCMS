package api

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"purecms/backend/internal/models"
)

func TestEmbedBackupMediaFilesAddsBase64Content(t *testing.T) {
	root := t.TempDir()
	relative := filepath.Join("2026", "06", "asset.txt")
	target := filepath.Join(root, relative)
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		t.Fatalf("MkdirAll returned error: %v", err)
	}
	if err := os.WriteFile(target, []byte("backup body"), 0o644); err != nil {
		t.Fatalf("WriteFile returned error: %v", err)
	}
	snapshot := models.BackupSnapshot{
		MediaAssets: []models.MediaAsset{{Filename: filepath.ToSlash(relative)}},
	}

	if err := embedBackupMediaFiles(root, &snapshot); err != nil {
		t.Fatalf("embedBackupMediaFiles returned error: %v", err)
	}

	want := base64.StdEncoding.EncodeToString([]byte("backup body"))
	if snapshot.MediaAssets[0].ContentBase64 != want {
		t.Fatalf("ContentBase64 = %q, want %q", snapshot.MediaAssets[0].ContentBase64, want)
	}
}

func TestPrepareBackupMediaFilesRejectsUnsafeFilename(t *testing.T) {
	tests := []struct {
		name     string
		filename string
	}{
		{name: "traversal", filename: "../outside.txt"},
		{name: "empty", filename: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assets := []models.MediaAsset{{
				Filename:      tt.filename,
				ContentBase64: base64.StdEncoding.EncodeToString([]byte("bad")),
			}}

			if _, err := prepareBackupMediaFiles(t.TempDir(), assets); err == nil {
				t.Fatal("prepareBackupMediaFiles accepted unsafe filename")
			}
		})
	}
}

func TestPrepareBackupMediaFilesRejectsUnsafeContent(t *testing.T) {
	tests := []struct {
		name     string
		asset    models.MediaAsset
		content  string
		wantPart string
	}{
		{
			name: "oversized content",
			asset: models.MediaAsset{
				Filename: "2026/06/large.txt",
				MimeType: "text/plain",
			},
			content:  strings.Repeat("a", int(maxUploadBytes)+1),
			wantPart: "too large",
		},
		{
			name: "html pretending to be image",
			asset: models.MediaAsset{
				Filename: "2026/06/fake.png",
				MimeType: "image/png",
			},
			content:  "<!doctype html><script>alert(1)</script>",
			wantPart: "unsupported",
		},
		{
			name: "unsafe extension for text",
			asset: models.MediaAsset{
				Filename: "2026/06/note.html",
				MimeType: "text/plain",
			},
			content:  "plain text",
			wantPart: "extension",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.asset.ContentBase64 = base64.StdEncoding.EncodeToString([]byte(tt.content))
			_, err := prepareBackupMediaFiles(t.TempDir(), []models.MediaAsset{tt.asset})
			if err == nil {
				t.Fatal("prepareBackupMediaFiles accepted unsafe content")
			}
			if !strings.Contains(err.Error(), tt.wantPart) {
				t.Fatalf("error = %q, want fragment %q", err.Error(), tt.wantPart)
			}
		})
	}
}

func TestEmbedBackupMediaFilesRejectsUnsafeFilename(t *testing.T) {
	snapshot := models.BackupSnapshot{
		MediaAssets: []models.MediaAsset{{Filename: ""}},
	}

	if err := embedBackupMediaFiles(t.TempDir(), &snapshot); err == nil {
		t.Fatal("embedBackupMediaFiles accepted unsafe filename")
	}
}

func TestRestoreBackupMediaFilesWritesDecodedContent(t *testing.T) {
	root := t.TempDir()
	relative := filepath.ToSlash(filepath.Join("2026", "06", "asset.txt"))
	assets := []models.MediaAsset{{
		Filename:      relative,
		MimeType:      "text/plain",
		ContentBase64: base64.StdEncoding.EncodeToString([]byte("restored body")),
	}}

	if err := restoreBackupMediaFiles(root, assets); err != nil {
		t.Fatalf("restoreBackupMediaFiles returned error: %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(relative)))
	if err != nil {
		t.Fatalf("ReadFile returned error: %v", err)
	}
	if string(raw) != "restored body" {
		t.Fatalf("restored body = %q, want restored body", string(raw))
	}
}
