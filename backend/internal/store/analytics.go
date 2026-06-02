package store

import (
	"context"
	"time"

	"purecms/backend/internal/models"
)

var analyticsLocation = time.FixedZone("Asia/Shanghai", 8*60*60)

func ViewDayInLocation(value time.Time, location *time.Location) string {
	if location == nil {
		location = time.UTC
	}
	return value.In(location).Format("2006-01-02")
}

func (s Store) RecordPostView(ctx context.Context, postID string, viewedAt time.Time) error {
	day := ViewDayInLocation(viewedAt, analyticsLocation)
	_, err := s.pool.Exec(ctx, `
INSERT INTO post_view_stats (day, post_id, views)
VALUES ($1,$2,1)
ON CONFLICT (day, post_id) DO UPDATE SET views=post_view_stats.views+1`, day, postID)
	return err
}

func (s Store) Analytics(ctx context.Context, days int) (models.AnalyticsSummary, error) {
	if days <= 0 || days > 90 {
		days = 14
	}
	now := time.Now().In(analyticsLocation)
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, analyticsLocation).AddDate(0, 0, -days+1)
	startDay := start.Format("2006-01-02")
	today := ViewDayInLocation(now, analyticsLocation)

	var summary models.AnalyticsSummary
	if err := s.pool.QueryRow(ctx, "SELECT COALESCE(sum(views),0) FROM post_view_stats").Scan(&summary.TotalViews); err != nil {
		return summary, err
	}
	if err := s.pool.QueryRow(ctx, "SELECT COALESCE(sum(views),0) FROM post_view_stats WHERE day=$1", today).Scan(&summary.TodayViews); err != nil {
		return summary, err
	}

	rows, err := s.pool.Query(ctx, `
SELECT day::text, COALESCE(sum(views),0)::int
FROM post_view_stats
WHERE day >= $1
GROUP BY day
ORDER BY day ASC`, startDay)
	if err != nil {
		return summary, err
	}
	dailyMap := map[string]int{}
	for rows.Next() {
		var day string
		var views int
		if err := rows.Scan(&day, &views); err != nil {
			rows.Close()
			return summary, err
		}
		dailyMap[day] = views
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return summary, err
	}
	rows.Close()

	summary.DailyViews = make([]models.DailyView, 0, days)
	for i := 0; i < days; i++ {
		day := start.AddDate(0, 0, i).Format("2006-01-02")
		summary.DailyViews = append(summary.DailyViews, models.DailyView{Date: day, Views: dailyMap[day]})
	}

	popularRows, err := s.pool.Query(ctx, `
SELECT p.id::text, p.title, p.slug, COALESCE(sum(s.views),0)::int AS views
FROM post_view_stats s
JOIN posts p ON p.id=s.post_id
WHERE s.day >= $1
GROUP BY p.id, p.title, p.slug
ORDER BY views DESC, p.title ASC
LIMIT 10`, startDay)
	if err != nil {
		return summary, err
	}
	defer popularRows.Close()
	for popularRows.Next() {
		var item models.PopularPost
		if err := popularRows.Scan(&item.ID, &item.Title, &item.Slug, &item.Views); err != nil {
			return summary, err
		}
		summary.PopularPosts = append(summary.PopularPosts, item)
	}
	return summary, popularRows.Err()
}

func (s Store) ListPostViewStats(ctx context.Context) ([]models.PostViewStat, error) {
	rows, err := s.pool.Query(ctx, `
SELECT s.day::text, s.post_id::text, p.title, p.slug, s.views
FROM post_view_stats s
JOIN posts p ON p.id=s.post_id
ORDER BY s.day DESC, s.views DESC
LIMIT 1000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := []models.PostViewStat{}
	for rows.Next() {
		var item models.PostViewStat
		if err := rows.Scan(&item.Day, &item.PostID, &item.PostTitle, &item.PostSlug, &item.Views); err != nil {
			return nil, err
		}
		stats = append(stats, item)
	}
	return stats, rows.Err()
}
