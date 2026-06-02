ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_posts_deleted_status_published ON posts(deleted_at, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_deleted_status_nav ON pages(deleted_at, status, show_in_nav, sort_order ASC);
