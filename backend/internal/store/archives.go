package store

import (
	"context"

	"purecms/backend/internal/i18n"
	"purecms/backend/internal/models"
)

type archivePostRow struct {
	models.ArchivePost
}

func (s Store) ListPostArchives(ctx context.Context) ([]models.ArchiveYear, error) {
	rows, err := s.pool.Query(ctx, `
SELECT
  p.id::text,
  p.title,
  p.slug,
  p.excerpt,
  p.source_language,
  p.content,
  COALESCE(p.published_at, p.created_at) AS published_at,
  p.view_count,
  (SELECT count(*) FROM comments c WHERE c.post_id=p.id AND c.status='approved') AS comment_count
FROM posts p
WHERE `+publicPostSQLCondition("p")+`
ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []archivePostRow{}
	for rows.Next() {
		var item archivePostRow
		var content string
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Slug,
			&item.Excerpt,
			&item.SourceLanguage,
			&content,
			&item.PublishedAt,
			&item.ViewCount,
			&item.CommentCount,
		); err != nil {
			return nil, err
		}
		item.SourceHash = i18n.SourceHash(item.SourceLanguage, item.Title, item.Excerpt, content)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return BuildPostArchives(items), nil
}

func BuildPostArchives(rows []archivePostRow) []models.ArchiveYear {
	archives := []models.ArchiveYear{}
	for _, row := range rows {
		localPublishedAt := row.PublishedAt.In(analyticsLocation)
		year := localPublishedAt.Year()
		month := int(localPublishedAt.Month())
		yearIndex := len(archives) - 1
		if yearIndex < 0 || archives[yearIndex].Year != year {
			archives = append(archives, models.ArchiveYear{
				Year:   year,
				Months: []models.ArchiveMonth{},
			})
			yearIndex = len(archives) - 1
		}

		monthIndex := len(archives[yearIndex].Months) - 1
		if monthIndex < 0 || archives[yearIndex].Months[monthIndex].Month != month {
			archives[yearIndex].Months = append(archives[yearIndex].Months, models.ArchiveMonth{
				Month: month,
				Posts: []models.ArchivePost{},
			})
			monthIndex = len(archives[yearIndex].Months) - 1
		}

		archives[yearIndex].PostCount++
		archives[yearIndex].Months[monthIndex].PostCount++
		archives[yearIndex].Months[monthIndex].Posts = append(archives[yearIndex].Months[monthIndex].Posts, row.ArchivePost)
	}
	return archives
}
