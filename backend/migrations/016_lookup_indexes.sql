CREATE INDEX IF NOT EXISTS idx_comments_post_status_created
  ON comments(post_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_post_categories_category_post
  ON post_categories(category_id, post_id);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_post
  ON post_tags(tag_id, post_id);
