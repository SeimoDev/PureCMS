CREATE TABLE IF NOT EXISTS post_view_stats (
  day date NOT NULL,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_view_stats_day ON post_view_stats(day DESC);
CREATE INDEX IF NOT EXISTS idx_post_view_stats_post ON post_view_stats(post_id, day DESC);

INSERT INTO post_view_stats (day, post_id, views)
SELECT COALESCE(p.published_at::date, p.created_at::date), p.id, p.view_count
FROM posts p
WHERE p.view_count > 0
ON CONFLICT (day, post_id) DO UPDATE SET views=post_view_stats.views + excluded.views;
