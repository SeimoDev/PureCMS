CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured boolean NOT NULL DEFAULT false,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  view_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_categories (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')),
  ip_address text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_touch_updated_at ON posts;
CREATE TRIGGER posts_touch_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(to_tsvector('simple', title || ' ' || excerpt || ' ' || content));
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status, created_at DESC);

INSERT INTO site_settings (key, value) VALUES
  ('site', '{"title":"未命名博客","subtitle":"记录技术、生活和长期思考","icp":"京ICP备00000000号-1","policeRecord":"","logoText":"CMS","wechat":"公众号名称","email":"hello@example.com"}'),
  ('seo', '{"keywords":"个人博客,技术博客,CMS","description":"一个基于 React、Go 和 PostgreSQL 的个人博客系统。"}'),
  ('comment', '{"moderation":true,"notice":"评论会在审核后显示，请理性交流。","spamKeywords":[],"rateLimitWindowMinutes":10,"rateLimitMax":5}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('技术随笔', 'tech', '工程实践、架构设计和工具链记录', 10),
  ('生活记录', 'life', '阅读、旅行和日常观察', 20)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tags (name, slug) VALUES
  ('React', 'react'),
  ('Go', 'go'),
  ('PostgreSQL', 'postgresql')
ON CONFLICT (slug) DO NOTHING;

WITH inserted_post AS (
  INSERT INTO posts (title, slug, excerpt, content, cover_url, status, featured, seo_title, seo_description, author_id, published_at)
  SELECT
    '第一篇：把个人博客做成内容中枢',
    'hello-cms',
    '一个面向中文互联网使用习惯的个人博客 CMS 起点，包含前台阅读、后台管理、评论审核和站点设置。',
    '# 把博客做成内容中枢

这个系统从个人博客的真实使用场景出发：文章要能被分类、标签和搜索组织起来，评论需要审核，底部要能放备案号、公众号和联系邮箱。

## 当前能力

后台可以维护文章、分类、标签、评论和站点设置。前台会展示文章封面、摘要、分类、标签、浏览量和评论入口。

## 技术栈

React 负责前台和后台界面，Go 提供 API，PostgreSQL 保存内容，Docker Compose 管理本地运行环境。',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80',
    'published',
    true,
    '第一篇：把个人博客做成内容中枢',
    'React + Go + PostgreSQL + Docker 的 Material Design 3 个人博客 CMS。',
    NULL,
    now()
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO post_categories (post_id, category_id)
SELECT inserted_post.id, categories.id
FROM inserted_post, categories
WHERE categories.slug = 'tech'
ON CONFLICT DO NOTHING;

WITH post_ref AS (
  SELECT id FROM posts WHERE slug = 'hello-cms'
)
INSERT INTO post_tags (post_id, tag_id)
SELECT post_ref.id, tags.id
FROM post_ref, tags
WHERE tags.slug IN ('react', 'go', 'postgresql')
ON CONFLICT DO NOTHING;
