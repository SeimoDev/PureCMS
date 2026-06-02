package api

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCopyLimitedUploadAcceptsExactLimit(t *testing.T) {
	var out bytes.Buffer
	size, err := copyLimitedUpload(&out, strings.NewReader("12345"), 5)
	if err != nil {
		t.Fatalf("copyLimitedUpload returned error: %v", err)
	}
	if size != 5 {
		t.Fatalf("size = %d, want 5", size)
	}
	if out.String() != "12345" {
		t.Fatalf("copied content = %q, want full content", out.String())
	}
}

func TestCopyLimitedUploadRejectsOversizedContent(t *testing.T) {
	var out bytes.Buffer
	size, err := copyLimitedUpload(&out, strings.NewReader("123456"), 5)
	if !errors.Is(err, errUploadTooLarge) {
		t.Fatalf("error = %v, want errUploadTooLarge", err)
	}
	if size != 5 {
		t.Fatalf("size = %d, want capped written size 5", size)
	}
	if out.String() != "12345" {
		t.Fatalf("copied content = %q, want capped content", out.String())
	}
}

func TestUploadsFileServerServesFilesAndHidesDirectories(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "2026", "06")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("MkdirAll returned error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "asset.txt"), []byte("asset body"), 0o644); err != nil {
		t.Fatalf("WriteFile returned error: %v", err)
	}
	handler := http.StripPrefix("/uploads/", uploadsFileServer(root))

	fileRec := httptest.NewRecorder()
	handler.ServeHTTP(fileRec, httptest.NewRequest(http.MethodGet, "/uploads/2026/06/asset.txt", nil))
	if fileRec.Code != http.StatusOK {
		t.Fatalf("file status = %d, want 200", fileRec.Code)
	}
	if fileRec.Body.String() != "asset body" {
		t.Fatalf("file body = %q, want asset body", fileRec.Body.String())
	}
	if got := fileRec.Header().Get("Cache-Control"); got != "public, max-age=2592000, immutable" {
		t.Fatalf("file Cache-Control = %q, want public immutable cache", got)
	}
	if got := fileRec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("file X-Content-Type-Options = %q, want nosniff", got)
	}

	dirRec := httptest.NewRecorder()
	handler.ServeHTTP(dirRec, httptest.NewRequest(http.MethodGet, "/uploads/2026/06/", nil))
	if dirRec.Code != http.StatusNotFound {
		t.Fatalf("directory status = %d, want 404", dirRec.Code)
	}
	if strings.Contains(dirRec.Body.String(), "asset.txt") {
		t.Fatalf("directory response leaked filename: %q", dirRec.Body.String())
	}
}

func TestUploadFileExtensionUsesValidatedMediaType(t *testing.T) {
	tests := []struct {
		name     string
		original string
		mimeType string
		want     string
	}{
		{name: "plain text cannot keep html extension", original: "note.html", mimeType: "text/plain", want: ".txt"},
		{name: "markdown uses markdown extension", original: "draft.txt", mimeType: "text/markdown", want: ".md"},
		{name: "jpeg normalizes extension", original: "cover.jpeg", mimeType: "image/jpeg", want: ".jpg"},
		{name: "pdf uses pdf extension", original: "report.bin", mimeType: "application/pdf", want: ".pdf"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := uploadFileExtension(tt.original, tt.mimeType); got != tt.want {
				t.Fatalf("uploadFileExtension(%q, %q) = %q, want %q", tt.original, tt.mimeType, got, tt.want)
			}
		})
	}
}
