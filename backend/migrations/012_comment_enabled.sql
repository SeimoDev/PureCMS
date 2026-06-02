INSERT INTO site_settings (key, value)
VALUES ('comment', '{"enabled":true,"moderation":true,"notice":"评论会在审核后显示，请理性交流。","spamKeywords":[],"rateLimitWindowMinutes":10,"rateLimitMax":5}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = site_settings.value || '{"enabled":true}'::jsonb
WHERE site_settings.key = 'comment'
  AND NOT (site_settings.value ? 'enabled');
