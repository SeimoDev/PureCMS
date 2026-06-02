CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  show_in_nav boolean NOT NULL DEFAULT false,
  nav_label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS pages_touch_updated_at ON pages;
CREATE TRIGGER pages_touch_updated_at
BEFORE UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_pages_public_nav ON pages(status, show_in_nav, sort_order ASC);

INSERT INTO pages (title, slug, content, status, show_in_nav, nav_label, sort_order, seo_title, seo_description) VALUES
  ('关于本站', 'about', '# 关于本站

这里可以写站长介绍、博客定位、联系方式和内容转载说明。

这个页面由自定义页面模块管理，适合放「关于我」「项目」「留言板」等非文章内容。', 'published', true, '关于', 10, '关于本站', '个人博客关于页面')
ON CONFLICT (slug) DO NOTHING;
