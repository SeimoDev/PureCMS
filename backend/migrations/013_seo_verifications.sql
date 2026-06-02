INSERT INTO site_settings (key, value)
VALUES (
  'seo',
  '{
    "keywords":"",
    "description":"",
    "baiduSiteVerification":"",
    "googleSiteVerification":"",
    "bingSiteVerification":"",
    "so360SiteVerification":"",
    "sogouSiteVerification":""
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = '{
  "keywords":"",
  "description":"",
  "baiduSiteVerification":"",
  "googleSiteVerification":"",
  "bingSiteVerification":"",
  "so360SiteVerification":"",
  "sogouSiteVerification":""
}'::jsonb || site_settings.value
WHERE site_settings.key = 'seo';
