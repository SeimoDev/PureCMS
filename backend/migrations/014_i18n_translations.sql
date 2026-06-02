ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_language text NOT NULL DEFAULT 'zh-CN';
ALTER TABLE post_revisions ADD COLUMN IF NOT EXISTS source_language text NOT NULL DEFAULT 'zh-CN';

CREATE TABLE IF NOT EXISTS post_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  source_language text NOT NULL DEFAULT 'zh-CN',
  source_hash text NOT NULL,
  title text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, language_code, source_hash)
);

DROP TRIGGER IF EXISTS post_translations_touch_updated_at ON post_translations;
CREATE TRIGGER post_translations_touch_updated_at
BEFORE UPDATE ON post_translations
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_post_translations_post_language ON post_translations(post_id, language_code, updated_at DESC);

INSERT INTO site_settings (key, value)
VALUES (
  'translation',
  '{"enabled":false,"provider":"openai-compatible","endpoint":"https://api.openai.com/v1/chat/completions","model":"gpt-4o-mini","apiKey":"","timeoutSeconds":30}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
