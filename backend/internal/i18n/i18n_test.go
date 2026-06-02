package i18n

import "testing"

func TestNormalizeLanguageCodeMatchesSupportedLanguages(t *testing.T) {
	tests := map[string]string{
		"zh":      "zh-CN",
		"zh-Hant": "zh-TW",
		"en-US":   "en",
		"ja-JP":   "ja",
		"ar-SA":   "ar",
		"unknown": "zh-CN",
	}

	for input, want := range tests {
		if got := NormalizeLanguageCode(input); got != want {
			t.Fatalf("NormalizeLanguageCode(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestSplitMarkdownSegmentsKeepsBlocks(t *testing.T) {
	segments := SplitMarkdownSegments("# 标题\n\n第一段\n继续\n\n- A\n- B")
	if len(segments) != 3 {
		t.Fatalf("len(segments) = %d, want 3: %#v", len(segments), segments)
	}
	if segments[0] != "# 标题" || segments[1] != "第一段\n继续" {
		t.Fatalf("segments = %#v", segments)
	}
}

func TestSourceHashChangesWhenContentChanges(t *testing.T) {
	left := SourceHash("zh-CN", "标题", "摘要", "正文")
	right := SourceHash("zh-CN", "标题", "摘要", "正文更新")
	if left == right {
		t.Fatal("SourceHash should change when content changes")
	}
}
