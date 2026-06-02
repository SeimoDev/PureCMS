package api

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

func TestSourcePostTranslationKeepsSourceSegments(t *testing.T) {
	post := models.Post{
		ID:             "post-1",
		Title:          "Title",
		Excerpt:        "Excerpt",
		Content:        "# Title\n\nFirst paragraph",
		SourceLanguage: "zh-CN",
	}
	hash := i18n.SourceHash(post.SourceLanguage, post.Title, post.Excerpt, post.Content)
	got := sourcePostTranslation(post, hash)

	if got.LanguageCode != "zh-CN" || got.SourceHash != hash {
		t.Fatalf("translation metadata = %+v, want zh-CN and source hash", got)
	}
	if len(got.Segments) != 2 {
		t.Fatalf("len(Segments) = %d, want 2", len(got.Segments))
	}
	if got.Segments[1].TranslatedText != "First paragraph" {
		t.Fatalf("second segment = %+v, want source text preserved", got.Segments[1])
	}
}

func TestAutoTranslationTargetLanguagesSkipSourceLanguage(t *testing.T) {
	targets := autoTranslationTargetLanguages("zh-CN")
	if len(targets) != len(i18n.SupportedLanguages)-1 {
		t.Fatalf("len(targets) = %d, want every supported non-source language", len(targets))
	}
	for _, target := range targets {
		if target == "zh-CN" {
			t.Fatalf("targets include source language: %v", targets)
		}
	}
	want := map[string]bool{
		"zh-TW": true,
		"en":    true,
		"ja":    true,
		"fr":    true,
		"hi":    true,
		"es":    true,
		"ar":    true,
		"ru":    true,
		"pt":    true,
		"eo":    true,
	}
	for _, target := range targets {
		delete(want, target)
	}
	if len(want) > 0 {
		t.Fatalf("targets missing languages: %v", want)
	}
}

func TestShouldAutoTranslateOnlyPublishedPosts(t *testing.T) {
	if !shouldAutoTranslatePost(models.Post{Status: "published"}) {
		t.Fatal("published post should trigger auto translation")
	}
	if shouldAutoTranslatePost(models.Post{Status: "draft"}) {
		t.Fatal("draft post should not trigger auto translation")
	}
	if shouldAutoTranslatePost(models.Post{Status: "archived"}) {
		t.Fatal("archived post should not trigger auto translation")
	}
}

func TestPlanPublishedPostTranslationsTargetsEveryNonSourceLanguage(t *testing.T) {
	post := models.Post{
		ID:             "post-1",
		Title:          "Original title",
		Excerpt:        "Original excerpt",
		Content:        "First paragraph\n\nSecond paragraph",
		SourceLanguage: "en-US",
		Status:         "published",
	}

	plan, ok := planPublishedPostTranslations(post)
	if !ok {
		t.Fatal("published post should produce a translation plan")
	}
	if plan.SourceLanguage != "en" {
		t.Fatalf("SourceLanguage = %q, want en", plan.SourceLanguage)
	}
	wantHash := i18n.SourceHash("en", post.Title, post.Excerpt, post.Content)
	if plan.SourceHash != wantHash {
		t.Fatalf("SourceHash = %q, want %q", plan.SourceHash, wantHash)
	}
	if len(plan.CacheLanguages) != len(i18n.SupportedLanguages) {
		t.Fatalf("len(CacheLanguages) = %d, want every supported language", len(plan.CacheLanguages))
	}
	if plan.CacheLanguages[0] != "zh-CN" {
		t.Fatalf("first cache language = %q, want zh-CN", plan.CacheLanguages[0])
	}
	if len(plan.TargetLanguages) != len(i18n.SupportedLanguages)-1 {
		t.Fatalf("len(TargetLanguages) = %d, want every supported non-source language", len(plan.TargetLanguages))
	}
	for _, target := range plan.TargetLanguages {
		if target == plan.SourceLanguage {
			t.Fatalf("translation plan includes source language: %v", plan.TargetLanguages)
		}
	}
}

func TestPlanPublishedPostTranslationsSkipsUnpublishedPosts(t *testing.T) {
	if _, ok := planPublishedPostTranslations(models.Post{Status: "draft"}); ok {
		t.Fatal("draft post should not produce a translation plan")
	}
	if _, ok := planPublishedPostTranslations(models.Post{Status: "archived"}); ok {
		t.Fatal("archived post should not produce a translation plan")
	}
}

func TestPostMutationHandlersTriggerPublishTimeTranslations(t *testing.T) {
	serverSource := readAPISource(t, "server.go")
	for _, handler := range []string{"createPost", "updatePost", "restorePost"} {
		assertHandlerTriggersPublishTimeTranslations(t, serverSource, handler)
	}

	adminSource := readAPISource(t, "admin.go")
	assertHandlerTriggersPublishTimeTranslations(t, adminSource, "restorePostRevision")
}

func TestPublishTimeTranslationTriggerStartsBackgroundTranslation(t *testing.T) {
	source := readAPISource(t, "server.go")
	triggerBody := handlerSource(t, source, "triggerPublishedPostTranslations")

	for _, want := range []string{
		"planPublishedPostTranslations(post)",
		"s.preparePublishedPostTranslationJobs(ctx, post, plan)",
		"s.runPreparedPublishedPostTranslations(post, plan, targets, cfg)",
	} {
		if !strings.Contains(triggerBody, want) {
			t.Fatalf("triggerPublishedPostTranslations should contain %q:\n%s", want, triggerBody)
		}
	}
	prepareIndex := strings.Index(triggerBody, "s.preparePublishedPostTranslationJobs(ctx, post, plan)")
	runIndex := strings.Index(triggerBody, "s.runPreparedPublishedPostTranslations(post, plan, targets, cfg)")
	if prepareIndex < 0 || runIndex < 0 || prepareIndex > runIndex {
		t.Fatalf("triggerPublishedPostTranslations should persist translation jobs before starting background translation:\n%s", triggerBody)
	}

	workerBody := handlerSource(t, source, "runPreparedPublishedPostTranslations")
	for _, want := range []string{
		"go func",
		"context.Background()",
		"s.ensurePostTranslations(ctx, post, plan.SourceHash, plan.SourceLanguage, targets, cfg)",
	} {
		if !strings.Contains(workerBody, want) {
			t.Fatalf("runPreparedPublishedPostTranslations should contain %q:\n%s", want, workerBody)
		}
	}
}

func TestPublicPostTranslationOnlyReadsPreparedCache(t *testing.T) {
	serverSource := readAPISource(t, "server.go")
	body := handlerSource(t, serverSource, "getPublicPostTranslation")

	for _, forbidden := range []string{
		"createPostTranslation(",
		"ensurePostTranslations(",
		"ensurePublishedPostTranslations(",
		"triggerPublishedPostTranslations(",
		"missingTranslationTargets(",
	} {
		if strings.Contains(body, forbidden) {
			t.Fatalf("public translation handler should only read prepared cache, but calls %s", forbidden)
		}
	}
	for _, required := range []string{
		"s.store.GetPostTranslation",
		"missingTranslationStatus()",
		"http.StatusNotFound",
	} {
		if !strings.Contains(body, required) && !strings.Contains(serverSource, required) {
			t.Fatalf("public translation handler should expose missing prepared cache through %s", required)
		}
	}
}

func TestPublicPostListsReadCachedTranslations(t *testing.T) {
	serverSource := readAPISource(t, "server.go")
	for _, tc := range []struct {
		handler string
		want    string
	}{
		{handler: "listPublicPosts", want: "s.localizePublicPosts(r.Context()"},
		{handler: "listArchives", want: "s.localizePublicArchives(r.Context()"},
	} {
		body := handlerSource(t, serverSource, tc.handler)
		if !strings.Contains(body, "publicContentLanguage(r)") {
			t.Fatalf("%s should read requested public content language:\n%s", tc.handler, body)
		}
		if !strings.Contains(body, tc.want) {
			t.Fatalf("%s should localize list content from cached translations:\n%s", tc.handler, body)
		}
		for _, forbidden := range []string{"createPostTranslation(", "ensurePostTranslations(", "triggerPublishedPostTranslations("} {
			if strings.Contains(body, forbidden) {
				t.Fatalf("%s should only read cached translations, but calls %s:\n%s", tc.handler, forbidden, body)
			}
		}
	}
}

func TestApplyPostTranslationToPublicListItems(t *testing.T) {
	post := models.Post{Title: "原题", Excerpt: "原摘要", Content: "原文"}
	applyPostTranslationToListItem(&post, models.PostTranslation{
		Title:   "Translated title",
		Excerpt: "Translated excerpt",
		Content: "Translated content",
	})
	if post.Title != "Translated title" || post.Excerpt != "Translated excerpt" || post.Content != "Translated content" {
		t.Fatalf("localized post = %+v, want translated title, excerpt, and content", post)
	}

	archivePost := models.ArchivePost{Title: "原题", Excerpt: "原摘要"}
	applyPostTranslationToArchiveItem(&archivePost, models.PostTranslation{Title: "Archive title", Excerpt: "Archive excerpt"})
	if archivePost.Title != "Archive title" || archivePost.Excerpt != "Archive excerpt" {
		t.Fatalf("localized archive post = %+v, want translated title and excerpt", archivePost)
	}
}

func readAPISource(t *testing.T, filename string) string {
	t.Helper()
	raw, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("read %s: %v", filename, err)
	}
	return string(raw)
}

func handlerSource(t *testing.T, source, handler string) string {
	t.Helper()
	signature := "func (s Server) " + handler + "("
	start := strings.Index(source, signature)
	if start < 0 {
		t.Fatalf("missing handler %s", handler)
	}
	rest := source[start+len(signature):]
	next := strings.Index(rest, "\nfunc ")
	if next >= 0 {
		return rest[:next]
	}
	return rest
}

func assertHandlerTriggersPublishTimeTranslations(t *testing.T, source, handler string) {
	t.Helper()
	body := handlerSource(t, source, handler)
	if !strings.Contains(body, "s.triggerPublishedPostTranslations(r.Context(), post)") {
		t.Fatalf("%s should trigger publish-time translations after mutating a published post", handler)
	}
}

func TestPostMutationLogDetailIncludesPublishTimeTranslationTargets(t *testing.T) {
	post := models.Post{
		Title:          "Published article",
		Status:         "published",
		SourceLanguage: "zh-CN",
	}

	got := postMutationLogDetail(post)

	if got["translationMode"] != "publish-time" || got["sourceLanguage"] != "zh-CN" {
		t.Fatalf("translation log detail = %+v, want publish-time zh-CN metadata", got)
	}
	if got["translationLanguageCount"] != len(i18n.SupportedLanguages) {
		t.Fatalf("translationLanguageCount = %v, want every supported language", got["translationLanguageCount"])
	}
	languages, ok := got["translationLanguages"].([]string)
	if !ok {
		t.Fatalf("translationLanguages = %#v, want []string", got["translationLanguages"])
	}
	if len(languages) != len(i18n.SupportedLanguages) {
		t.Fatalf("translationLanguages = %v, want every supported language", languages)
	}
	if got["translationTargetCount"] != len(i18n.SupportedLanguages)-1 {
		t.Fatalf("translationTargetCount = %v, want every non-source language", got["translationTargetCount"])
	}
	targets, ok := got["translationTargets"].([]string)
	if !ok {
		t.Fatalf("translationTargets = %#v, want []string", got["translationTargets"])
	}
	for _, target := range targets {
		if target == "zh-CN" {
			t.Fatalf("translationTargets include source language: %v", targets)
		}
	}
}

func TestPostMutationLogDetailSkipsTranslationPlanForDrafts(t *testing.T) {
	got := postMutationLogDetail(models.Post{Title: "Draft", Status: "draft", SourceLanguage: "zh-CN"})

	if _, ok := got["translationTargets"]; ok {
		t.Fatalf("draft log detail should not include translation targets: %+v", got)
	}
	if _, ok := got["translationLanguages"]; ok {
		t.Fatalf("draft log detail should not include translation languages: %+v", got)
	}
	if got["title"] != "Draft" || got["status"] != "draft" {
		t.Fatalf("draft log detail = %+v, want title and status", got)
	}
}

func TestRestoredPublishedPostLogDetailKeepsPublishTimeTranslationPlan(t *testing.T) {
	got := restoredPostLogDetail(models.Post{Title: "Restored article", Status: "published", SourceLanguage: "zh-CN"})

	if got["restoreMode"] != "trash" {
		t.Fatalf("restoreMode = %v, want trash", got["restoreMode"])
	}
	if got["translationMode"] != "publish-time" {
		t.Fatalf("translationMode = %v, want publish-time", got["translationMode"])
	}
	if got["translationTargetCount"] != len(i18n.SupportedLanguages)-1 {
		t.Fatalf("translationTargetCount = %v, want every non-source language", got["translationTargetCount"])
	}
}

func TestMissingCachedTranslationReturnsNotFound(t *testing.T) {
	status, message := missingTranslationStatus()
	if status != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", status)
	}
	if message == "" {
		t.Fatal("missing translation message should be readable")
	}
}

func TestTranslationSettingsReadyRequiresRunnableConfig(t *testing.T) {
	ready := i18n.TranslationSettings{
		Enabled:  true,
		APIKey:   "key",
		Endpoint: "https://translation.test",
		Model:    "model",
	}
	if !translationSettingsReady(ready) {
		t.Fatal("complete enabled translation settings should be ready")
	}
	withoutKey := ready
	withoutKey.APIKey = ""
	if translationSettingsReady(withoutKey) {
		t.Fatal("translation settings without an API key should not be ready")
	}
	disabled := ready
	disabled.Enabled = false
	if translationSettingsReady(disabled) {
		t.Fatal("disabled translation settings should not be ready")
	}
}

func TestPublishTimeTranslationJobStateReflectsConfiguration(t *testing.T) {
	ready := i18n.TranslationSettings{
		Enabled:  true,
		APIKey:   "key",
		Endpoint: "https://translation.test",
		Model:    "model",
	}
	status, message, runnable := publishTimeTranslationJobState(ready)
	if status != "running" || message != "" || !runnable {
		t.Fatalf("ready state = (%q, %q, %v), want running and runnable", status, message, runnable)
	}

	status, message, runnable = publishTimeTranslationJobState(i18n.TranslationSettings{Enabled: true})
	if status != "failed" || message == "" || runnable {
		t.Fatalf("incomplete state = (%q, %q, %v), want failed with message", status, message, runnable)
	}
}

func TestTranslationBackfillPostFilterScansPublishedAdminPosts(t *testing.T) {
	filter := translationBackfillPostFilter(-10)
	if !filter.Admin {
		t.Fatal("backfill filter should scan admin-visible posts")
	}
	if filter.Status != "published" {
		t.Fatalf("status = %q, want published", filter.Status)
	}
	if filter.Limit != translationBackfillPostPageLimit {
		t.Fatalf("limit = %d, want %d", filter.Limit, translationBackfillPostPageLimit)
	}
	if filter.Offset != 0 {
		t.Fatalf("offset = %d, want negative values clamped to 0", filter.Offset)
	}

	filter = translationBackfillPostFilter(75)
	if filter.Offset != 75 {
		t.Fatalf("offset = %d, want requested offset", filter.Offset)
	}
}

func TestStartupBackfillQueuesPublishedPostTranslations(t *testing.T) {
	source := readAPISource(t, "translation_cache.go")
	body := handlerSource(t, source, "StartPublishedPostTranslationBackfill")

	for _, want := range []string{
		"s.store.GetSettings",
		"translationSettingsReady(cfg)",
		"s.queueMissingPublishedPostTranslations(ctx, cfg, \"startup\")",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("StartPublishedPostTranslationBackfill should contain %q:\n%s", want, body)
		}
	}

	queueBody := handlerSource(t, source, "queueMissingPublishedPostTranslations")
	for _, want := range []string{
		"s.planMissingPublishedPostTranslations(ctx)",
		"s.runTranslationBackfillJobs(jobs, cfg)",
	} {
		if !strings.Contains(queueBody, want) {
			t.Fatalf("queueMissingPublishedPostTranslations should contain %q:\n%s", want, queueBody)
		}
	}
}

func TestBackfillTranslationCachesResponseCountsQueuedJobs(t *testing.T) {
	var result backfillTranslationCachesResponse
	result.addTranslationBackfillJob(translationBackfillJob{TargetLanguages: []string{"en", "ja"}})
	result.addTranslationBackfillJob(translationBackfillJob{TargetLanguages: []string{"fr"}})

	if result.QueuedPosts != 2 {
		t.Fatalf("QueuedPosts = %d, want 2", result.QueuedPosts)
	}
	if result.QueuedTargets != 3 {
		t.Fatalf("QueuedTargets = %d, want 3", result.QueuedTargets)
	}
}

func TestTranslateTargetsConcurrentlyHandlesEmptyTargets(t *testing.T) {
	called := false
	err := translateTargetsConcurrently(context.Background(), []string{}, func(ctx context.Context, targetLanguage string) error {
		called = true
		return nil
	})
	if err != nil {
		t.Fatalf("translateTargetsConcurrently returned error: %v", err)
	}
	if called {
		t.Fatal("translateTargetsConcurrently should not call translator for empty targets")
	}
}

func TestTranslateTargetsConcurrentlyRunsLanguagesInParallel(t *testing.T) {
	var active atomic.Int32
	var maxActive atomic.Int32
	targets := []string{"en", "ja", "fr", "es"}

	err := translateTargetsConcurrently(context.Background(), targets, func(ctx context.Context, targetLanguage string) error {
		current := active.Add(1)
		for {
			previous := maxActive.Load()
			if current <= previous || maxActive.CompareAndSwap(previous, current) {
				break
			}
		}
		time.Sleep(25 * time.Millisecond)
		active.Add(-1)
		return nil
	})
	if err != nil {
		t.Fatalf("translateTargetsConcurrently returned error: %v", err)
	}
	if maxActive.Load() < 2 {
		t.Fatalf("max concurrent language translators = %d, want at least 2", maxActive.Load())
	}
}

func TestTranslateTargetsConcurrentlyKeepsGoingAfterError(t *testing.T) {
	sentinel := errors.New("target failed")
	var calls atomic.Int32

	err := translateTargetsConcurrently(context.Background(), []string{"en", "ja", "fr"}, func(ctx context.Context, targetLanguage string) error {
		calls.Add(1)
		if targetLanguage == "ja" {
			return sentinel
		}
		return nil
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("error = %v, want sentinel", err)
	}
	if calls.Load() != 3 {
		t.Fatalf("calls = %d, want all target languages attempted", calls.Load())
	}
}

func TestTranslateMarkdownSegmentsConcurrentlyPreservesOrder(t *testing.T) {
	sourceSegments := []string{"first paragraph", "second paragraph", "third paragraph"}
	segments, content, err := translateMarkdownSegmentsConcurrently(context.Background(), sourceSegments, "zh-CN", "en", func(ctx context.Context, sourceLanguage, targetLanguage, text string) (string, error) {
		if text == "first paragraph" {
			time.Sleep(20 * time.Millisecond)
		}
		return "translated:" + text, nil
	})
	if err != nil {
		t.Fatalf("translateMarkdownSegmentsConcurrently returned error: %v", err)
	}
	if content != "translated:first paragraph\n\ntranslated:second paragraph\n\ntranslated:third paragraph" {
		t.Fatalf("content = %q, want translated segments joined in source order", content)
	}
	for index, segment := range segments {
		if segment.Index != index {
			t.Fatalf("segment index = %d, want %d", segment.Index, index)
		}
		if segment.SourceText != sourceSegments[index] {
			t.Fatalf("segment source = %q, want %q", segment.SourceText, sourceSegments[index])
		}
	}
}

func TestTranslateMarkdownSegmentsConcurrentlyRunsSegmentsInParallel(t *testing.T) {
	var active atomic.Int32
	var maxActive atomic.Int32
	sourceSegments := []string{"a", "b", "c", "d"}

	_, _, err := translateMarkdownSegmentsConcurrently(context.Background(), sourceSegments, "zh-CN", "en", func(ctx context.Context, sourceLanguage, targetLanguage, text string) (string, error) {
		current := active.Add(1)
		for {
			previous := maxActive.Load()
			if current <= previous || maxActive.CompareAndSwap(previous, current) {
				break
			}
		}
		time.Sleep(25 * time.Millisecond)
		active.Add(-1)
		return text, nil
	})
	if err != nil {
		t.Fatalf("translateMarkdownSegmentsConcurrently returned error: %v", err)
	}
	if maxActive.Load() < 2 {
		t.Fatalf("max concurrent translators = %d, want at least 2", maxActive.Load())
	}
}

func TestTranslateMarkdownSegmentsConcurrentlyStopsOnError(t *testing.T) {
	sentinel := errors.New("translator failed")
	_, _, err := translateMarkdownSegmentsConcurrently(context.Background(), []string{"ok", "bad", "later"}, "zh-CN", "en", func(ctx context.Context, sourceLanguage, targetLanguage, text string) (string, error) {
		if text == "bad" {
			return "", sentinel
		}
		return text, nil
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("error = %v, want sentinel", err)
	}
}
