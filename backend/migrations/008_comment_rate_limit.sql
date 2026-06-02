CREATE INDEX IF NOT EXISTS idx_comments_ip_created_at ON comments(ip_address, created_at DESC);

INSERT INTO site_settings (key, value)
VALUES ('comment', '{"moderation":true,"notice":"评论会在审核后显示，请理性交流。","spamKeywords":[],"rateLimitWindowMinutes":10,"rateLimitMax":5}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = site_settings.value
  || '{"rateLimitWindowMinutes":10,"rateLimitMax":5}'::jsonb
WHERE site_settings.key = 'comment'
  AND (
    NOT (site_settings.value ? 'rateLimitWindowMinutes')
    OR NOT (site_settings.value ? 'rateLimitMax')
  );
