ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS author_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_admin_reply boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_not_self'
  ) THEN
    ALTER TABLE comments
      ADD CONSTRAINT comments_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created ON comments(post_id, parent_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
