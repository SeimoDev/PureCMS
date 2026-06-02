CREATE TABLE IF NOT EXISTS friend_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS friend_links_touch_updated_at ON friend_links;
CREATE TRIGGER friend_links_touch_updated_at
BEFORE UPDATE ON friend_links
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_friend_links_status_sort ON friend_links(status, sort_order ASC, name ASC);

INSERT INTO friend_links (name, url, description, logo_url, status, sort_order) VALUES
  ('Material Design', 'https://m3.material.io', 'Material Design 3 官方设计体系', '', 'active', 10),
  ('Go', 'https://go.dev', 'Go 语言官方网站', '', 'active', 20),
  ('React', 'https://react.dev', 'React 官方文档', '', 'active', 30)
ON CONFLICT (url) DO NOTHING;
