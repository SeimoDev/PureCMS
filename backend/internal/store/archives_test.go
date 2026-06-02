package store

import (
	"testing"
	"time"

	"purecms/backend/internal/models"
)

func TestBuildPostArchivesGroupsRowsByYearAndMonth(t *testing.T) {
	rows := []archivePostRow{
		{ArchivePost: models.ArchivePost{ID: "1", Title: "六月文章", Slug: "june", PublishedAt: time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)}},
		{ArchivePost: models.ArchivePost{ID: "2", Title: "五月文章", Slug: "may", PublishedAt: time.Date(2026, 5, 3, 8, 0, 0, 0, time.UTC)}},
		{ArchivePost: models.ArchivePost{ID: "3", Title: "去年文章", Slug: "last-year", PublishedAt: time.Date(2025, 12, 8, 8, 0, 0, 0, time.UTC)}},
	}

	got := BuildPostArchives(rows)

	if len(got) != 2 {
		t.Fatalf("len(archives) = %d, want 2 years", len(got))
	}
	if got[0].Year != 2026 || got[0].PostCount != 2 {
		t.Fatalf("first year = %+v, want 2026 with 2 posts", got[0])
	}
	if len(got[0].Months) != 2 {
		t.Fatalf("len(months) = %d, want 2 months", len(got[0].Months))
	}
	if got[0].Months[0].Month != 6 || got[0].Months[0].PostCount != 1 {
		t.Fatalf("first month = %+v, want June with 1 post", got[0].Months[0])
	}
	if got[0].Months[0].Posts[0].Slug != "june" {
		t.Fatalf("first post slug = %q, want june", got[0].Months[0].Posts[0].Slug)
	}
	if got[1].Year != 2025 || got[1].Months[0].Month != 12 {
		t.Fatalf("second year/month = %+v, want 2025/12", got[1])
	}
}

func TestBuildPostArchivesKeepsEmptyRowsEmpty(t *testing.T) {
	got := BuildPostArchives(nil)

	if len(got) != 0 {
		t.Fatalf("len(archives) = %d, want empty", len(got))
	}
}

func TestBuildPostArchivesGroupsByShanghaiCalendar(t *testing.T) {
	rows := []archivePostRow{
		{ArchivePost: models.ArchivePost{ID: "1", Title: "北京时间六月", Slug: "june-cn", PublishedAt: time.Date(2026, 5, 31, 16, 30, 0, 0, time.UTC)}},
	}

	got := BuildPostArchives(rows)

	if len(got) != 1 || got[0].Year != 2026 {
		t.Fatalf("archives = %+v, want 2026 year", got)
	}
	if got[0].Months[0].Month != 6 {
		t.Fatalf("month = %d, want June in Asia/Shanghai", got[0].Months[0].Month)
	}
}
