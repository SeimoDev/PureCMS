CREATE TABLE IF NOT EXISTS post_translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  source_language text NOT NULL DEFAULT 'zh-CN',
  source_hash text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
  error_message text NOT NULL DEFAULT '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, language_code, source_hash)
);

DROP TRIGGER IF EXISTS post_translation_jobs_touch_updated_at ON post_translation_jobs;
CREATE TRIGGER post_translation_jobs_touch_updated_at
BEFORE UPDATE ON post_translation_jobs
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_post_translation_jobs_status_updated ON post_translation_jobs(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_translation_jobs_post_language ON post_translation_jobs(post_id, language_code, updated_at DESC);
