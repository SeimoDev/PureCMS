INSERT INTO site_settings (key, value)
VALUES ('appearance', '{"themeMode":"light","accentColor":"#256B57","homeLayout":"cards","coverStyle":"image"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = site_settings.value
  || '{"themeMode":"light","accentColor":"#256B57","homeLayout":"cards","coverStyle":"image"}'::jsonb
WHERE site_settings.key = 'appearance'
  AND (
    NOT (site_settings.value ? 'themeMode')
    OR NOT (site_settings.value ? 'accentColor')
    OR NOT (site_settings.value ? 'homeLayout')
    OR NOT (site_settings.value ? 'coverStyle')
  );
