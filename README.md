# PureCMS

一个面向中文个人博客场景的全栈 CMS，技术栈为 React + Go + PostgreSQL + Docker。前台、后台管理侧和部署配置都按 Material Design 3 风格与中文互联网使用习惯构建。

## 当前包含

- 前台博客：文章分页列表、文章详情、阅读字数与时长、文章目录、Markdown 正文渲染、移动端导航、语言选择、发布后翻译缓存读取、复制链接、微博/QQ 空间分享、归档、搜索、自定义页面、公开友链、分类页、标签页、RSS、sitemap、robots、canonical/Twitter/OG meta、站长验证 meta、ICP备案/公众号等中文站点常见信息位。
- 后台管理：管理员登录、我的账号、仪表盘、访问统计、文章 CRUD、文章编写语言标注、文章发布后自动翻译、文章作者/浏览/评论运营信息、精选文章筛选与批量推荐、文章/页面 Markdown 快捷工具栏、本地自动草稿、媒体插图/封面选择、页面 CRUD、分类/标签/友链 CRUD、评论审核、站长回复、评论开关、评论限流、SEO 设置、AI 翻译配置、外观设置。
- 后台机制：多管理员用户管理、角色和停用状态、操作日志、媒体库上传和引用计数、系统运行状态、部署安全检查、内容回收站、文章/页面版本历史、JSON 备份导入导出、PostgreSQL 和上传目录运维备份脚本。
- 后端 API：Go + chi + pgx、JWT 鉴权、PostgreSQL 持久化、启动时自动执行 SQL 迁移并幂等初始化管理员。
- 容器化：`docker-compose.yml` 同时启动 PostgreSQL、API 和前端 Nginx 静态服务。

## 快速启动

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Production checklist: change `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`/`DATABASE_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, `PUBLIC_API_URL` before exposing the site.

启动后访问：

- 前台/后台入口：http://localhost:3000
- 同源 API 健康检查：http://localhost:3000/api/health
- 直连 API 调试入口：http://localhost:8080/api/health

默认管理员：

- 用户名：`admin`
- 密码：`ChangeMe123!`

生产部署前必须修改 `.env` 中的 `JWT_SECRET`、`ADMIN_USERNAME`、`ADMIN_PASSWORD` 和数据库密码；如使用自定义域名，把 `FRONTEND_URL` 和 `PUBLIC_API_URL` 都设置为公开访问的前端站点源，例如 `https://blog.example.com`。Docker 前端会反代 `/api` 和 `/uploads` 到后端，避免浏览器访问用户本机的 `localhost`。

## 本地开发

后端：

```powershell
cd backend
go run ./cmd/api
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

前端开发服务器默认读取 `VITE_API_BASE_URL`，源码未设置时使用 `http://localhost:8080/api`；Docker 构建默认使用同源 `/api`，由 Nginx 反代到后端服务。

本地质量检查：

```powershell
.\ops\quality-check.ps1
```

Linux/macOS：

```sh
sh ops/quality-check.sh
```

仓库内置 GitHub Actions `Quality Gate` 工作流，push 和 pull request 会自动执行后端测试、前端测试、lint 和生产构建。CI 还会构建后端与前端 Docker 镜像；本地机器安装 Docker 后可运行 `.\ops\quality-check.ps1 -IncludeDockerBuild` 或 `sh ops/quality-check.sh --include-docker-build` 做同等镜像构建检查。

## API 概览

公开接口：

- `GET /api/health`
- `GET /robots.txt`
- `GET /rss.xml`
- `GET /sitemap.xml`
- `GET /api/site`
- `GET /api/posts`，加 `paged=1&page=1&limit=10` 时返回 `{items,total,limit,offset}`
- `GET /api/posts/{slug}`
- `GET /api/posts/{slug}/translation?lang=en`
- `GET /api/archives`
- `GET /links`（前台路由）
- `GET /categories/{slug}`（前台路由）
- `GET /tags/{slug}`（前台路由）
- `GET /api/pages`
- `GET /api/pages/{slug}`
- `GET /api/categories`
- `GET /api/tags`
- `GET /api/friend-links`
- `GET /api/posts/{id}/comments`
- `POST /api/posts/{id}/comments`

管理接口：

- `POST /api/auth/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `PUT /api/admin/me/profile`
- `PUT /api/admin/me/password`
- `GET /api/admin/dashboard`
- `GET /api/admin/analytics`
- `GET|POST /api/admin/posts`，列表支持 `paged=1&page=1&limit=20&scheduled=1&featured=1`
- `GET|PUT|DELETE /api/admin/posts/{id}`
- `POST /api/admin/posts/{id}/restore`
- `DELETE /api/admin/posts/{id}/permanent` (admin only)
- `GET /api/admin/posts/{id}/revisions`
- `POST /api/admin/posts/{id}/revisions/{revisionId}/restore`
- `GET|POST /api/admin/pages`，列表支持 `paged=1&page=1&limit=10&q=keyword&status=published&nav=shown&deleted=1`
- `GET|PUT|DELETE /api/admin/pages/{id}`
- `POST /api/admin/pages/{id}/restore`
- `DELETE /api/admin/pages/{id}/permanent` (admin only)
- `GET /api/admin/pages/{id}/revisions`
- `POST /api/admin/pages/{id}/revisions/{revisionId}/restore`
- `GET|POST /api/admin/categories`
- `PUT|DELETE /api/admin/categories/{id}`
- `GET|POST /api/admin/tags`
- `PUT|DELETE /api/admin/tags/{id}`
- `GET|POST /api/admin/friend-links`
- `PUT|DELETE /api/admin/friend-links/{id}`
- `GET /api/admin/comments`
- `PUT /api/admin/comments/{id}/moderate`
- `POST /api/admin/comments/{id}/reply`
- `DELETE /api/admin/comments/{id}`
- `GET|PUT /api/admin/settings` (admin only)
- `GET|POST /api/admin/users` (admin only)，列表支持 `paged=1&page=1&limit=10&q=keyword&role=editor&status=active`
- `PUT|DELETE /api/admin/users/{id}` (admin only)
- `PUT /api/admin/users/{id}/password` (admin only)
- `GET /api/admin/activity-logs` (admin only)，支持 `paged=1&page=1&limit=20&q=keyword&action=update&entityType=post`
- `DELETE /api/admin/activity-logs/retention?days=90` (admin only)
- `GET /api/admin/system` (admin only)
- `GET /api/admin/backup/export` (admin only)
- `POST /api/admin/backup/import` (admin only)
- `GET /api/admin/translations` (admin only)，支持 `paged=1&page=1&limit=12&q=keyword&lang=en&source=zh-CN`
- `POST /api/admin/translations/backfill` (admin only)
- `DELETE /api/admin/translations/stale` (admin only)
- `DELETE /api/admin/translations/{id}` (admin only)
- `GET|POST /api/admin/media`，列表支持 `paged=1&page=1&limit=18&q=keyword&kind=image`，也可用 `mimeType=image/png` 精确筛选
- `PUT /api/admin/media/{id}`
- `DELETE /api/admin/media/{id}`
- `GET /uploads/{path}`

## 后台机制说明

- 后台每次请求都会读取数据库中的最新用户状态和角色；账号停用后已有登录态会立即失效，角色调整会即时影响权限。
- `admin` 角色可以管理用户、查看操作日志、备份导入导出和站点设置；`editor` 角色可维护内容、评论、友链和媒体。
- 后端启动时会幂等初始化 `ADMIN_USERNAME`。如果该用户名已存在但被降权或停用，会恢复为启用管理员并使用 `ADMIN_PASSWORD` 重置密码，同时递增 token 版本让旧登录态失效。
- 用户管理会阻止当前登录账号自我降权、停用或绕过当前密码校验重置自身密码，并保证至少保留一个启用状态的管理员。
- `/api/health` 会探测数据库和上传目录，正常返回 200，数据库不可用或上传目录缺失/不可写时异常时返回 503。Docker API 健康检查也使用该就绪信号。
- 后端 HTTP 服务配置了请求头、请求体、响应写入和空闲连接超时，并在收到 SIGINT/SIGTERM 时执行优雅关闭，减少慢连接占用和容器滚动更新时的中断风险。
- 后台系统状态会汇总 Go 运行时、OS/Arch、PID、启动时间、运行时长、数据库连接池、上传目录可写性、内容规模、翻译缓存健康度和部署安全基线。
- 新建用户、管理员重置密码和“我的账号”改密统一校验密码强度：至少 10 位，并包含大写字母、小写字母和数字。
- 后台登录失败会按“用户名 + 来源 IP”做进程内节流，默认 15 分钟最大 5 次失败，可通过 `LOGIN_RATE_LIMIT_WINDOW_MINUTES` 和 `LOGIN_RATE_LIMIT_MAX` 调整。
- 成功登录、失败登录、停用账号登录拦截、失败登录限流拦截、账号资料/密码变更、内容变更、评论审核、媒体上传/删除、用户变更都会写入 `activity_logs`。
- 文章和页面删除会先进回收站，管理员可恢复或彻底删除，降低误删风险。
- 文章和页面每次保存都会生成版本快照，后台可查看历史版本并恢复，恢复操作也会追加新的快照。
- 后台文章管理列表会展示作者、浏览量和评论数，并支持精选/非精选筛选与批量设置精选状态，便于维护首页推荐内容。
- 文章和页面编辑支持 Markdown 快捷工具栏、本地自动草稿、媒体库搜索、图片上传、插入 Markdown 图片和设置封面图。
- 公开文章和后台预览会根据 Markdown 标题自动生成目录与锚点，便于长文阅读。
- 公开文章和页面的 Markdown 渲染会统一转义 HTML；文本链接仅允许相对地址、HTTP(S) 和 `mailto:`，图片仅允许相对地址和 HTTP(S)。
- 公开评论提交会按 IP 限流，默认 10 分钟最大 5 条；评论可回复已通过评论，后台可直接发布站长回复，前台按父子关系展示楼中楼。
- 后台评论审核会展示邮箱、主页、IP 和 User-Agent 供反垃圾判断；危险协议主页只显示文本。
- 后台“站点设置”可维护前台显示模式、主题色、首页布局和封面样式，前台会按配置切换 Material Design 3 主题。

## i18n 与发布时翻译

- 内置简体中文、繁体中文、英文、日语、法语、印地语、西班牙语、阿拉伯语、俄语、葡萄牙语和世界语。
- 前台默认跟随浏览器语言，读者可用国旗和该语言本名手动切换；后台登录、管理导航和“我的账号”入口也会读取同一语言偏好并提供手动语言选择器。
- 文章默认按简体中文编写，后台编辑器可标注编写语言。
- 文章发布或更新为已发布状态后，后台会自动翻译到所有内置语言并缓存到 `post_translations`；从回收站恢复已发布文章时也会重新补齐缺失翻译任务。
- 如果先发布文章、后启用或补齐 AI 配置，保存设置后后台会自动扫描已发布文章并把缺失语言加入翻译队列；后台“翻译缓存”页也保留手动补齐入口。
- 前台文章详情页先加载原文，再按目标语言请求 `/api/posts/{slug}/translation` 读取已缓存译文；同一文章内容和语言后续直接读缓存。翻译尚未生成时返回 404，前台保留原文并提示稍后再试。
- 后台“站点设置”可维护 AI 翻译开关、OpenAI-compatible 接口地址、模型、API Key 和超时秒数；公开 `/api/site` 只暴露翻译开关、provider 和模型，不暴露 API Key、endpoint 和超时。

## SEO、媒体与备份

- 后台“站点设置”可维护百度、360、搜狗、Bing 和 Google 站长平台验证码，前台会输出对应的页面 meta 验证标签。
- 前台页面会自动输出 canonical、`og:url`、`og:site_name` 和 Twitter Card；文章详情页会把封面图作为 `og:image` / `twitter:image`。
- `robots.txt` 会允许公开站点抓取并声明 `sitemap.xml`，同时禁止抓取 `/admin`、`/login` 和 `/api/admin`。
- `sitemap.xml` 会收录首页、归档页、公开友链页、有文章的分类/标签页、已发布文章的所有内置语言访问 URL，以及所有已发布自定义页面。
- 公开 `/api/site` 只返回前台渲染需要的站点、SEO、外观和评论展示字段；评论审核关键词、审核开关和限流参数仅后台设置接口可见。
- 媒体文件默认保存在 Docker volume `api_uploads`，上传会限制大小、使用安全 MIME 白名单并嗅探文件头。媒体库会展示文件在文章封面、文章正文和页面正文中的引用数，引用中的媒体禁止删除。
- `/uploads/...` 只公开具体文件访问，目录路径会返回 404；公开媒体响应会带 `Cache-Control: public, max-age=2592000, immutable` 和 `nosniff`。
- Docker 前端 Nginx 提供 `/healthz` 容器健康检查，静态入口默认带 `nosniff`、Referrer、Frame、Permissions 和 Content-Security-Policy 安全响应头，并对 CSS/JS/JSON/SVG 启用 gzip。
- JSON 备份会包含用户密码哈希、操作日志、评论回复关系、文章/页面版本历史、文章翻译缓存、上传媒体文件内容和内容关联数据。备份文件应离线加密保存。
- 备份导入恢复媒体文件时会复用上传安全策略：校验相对路径、文件大小、MIME 白名单和扩展名一致性，拒绝路径穿越、HTML/SVG 伪装和超大文件。

## 运维

PostgreSQL 与上传目录的生产备份/恢复脚本见 [docs/operations.md](docs/operations.md)。

## 开源协议

PureCMS 以 GNU General Public License v3.0 开源，详见 [LICENSE](LICENSE)。
