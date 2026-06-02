CREATE TABLE IF NOT EXISTS post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  status text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  category_ids text[] NOT NULL DEFAULT '{}',
  tag_ids text[] NOT NULL DEFAULT '{}',
  published_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_post_revisions_post ON post_revisions(post_id, version_number DESC);

INSERT INTO post_revisions (
  post_id, version_number, title, slug, excerpt, content, cover_url, status, featured,
  seo_title, seo_description, category_ids, tag_ids, published_at, created_by, created_at
)
SELECT
  p.id,
  1,
  p.title,
  p.slug,
  p.excerpt,
  p.content,
  p.cover_url,
  p.status,
  p.featured,
  p.seo_title,
  p.seo_description,
  COALESCE(ARRAY(
    SELECT pc.category_id::text
    FROM post_categories pc
    WHERE pc.post_id = p.id
  ), '{}'),
  COALESCE(ARRAY(
    SELECT pt.tag_id::text
    FROM post_tags pt
    WHERE pt.post_id = p.id
  ), '{}'),
  p.published_at,
  p.author_id,
  p.updated_at
FROM posts p
WHERE NOT EXISTS (
  SELECT 1 FROM post_revisions pr WHERE pr.post_id = p.id
)
ON CONFLICT DO NOTHING;
