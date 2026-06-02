CREATE TABLE IF NOT EXISTS page_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL,
  show_in_nav boolean NOT NULL DEFAULT false,
  nav_label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_page_revisions_page_version ON page_revisions(page_id, version_number DESC);

INSERT INTO page_revisions (
  page_id, version_number, title, slug, content, status, show_in_nav, nav_label,
  sort_order, seo_title, seo_description, created_at
)
SELECT
  p.id,
  1,
  p.title,
  p.slug,
  p.content,
  p.status,
  p.show_in_nav,
  p.nav_label,
  p.sort_order,
  p.seo_title,
  p.seo_description,
  p.created_at
FROM pages p
WHERE NOT EXISTS (
  SELECT 1 FROM page_revisions pr WHERE pr.page_id = p.id
);
