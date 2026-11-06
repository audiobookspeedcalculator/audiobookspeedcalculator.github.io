# Audiobook Speed Calculator：Cloudflare Pages 发布与 Google 收录计划

- 状态：待执行。本轮只更新计划，尚未修改页面文件、GitHub 仓库、Cloudflare 或 Search Console。
- 前序合同终态：页面内容与自动验证已完成；实际手机触屏、长表阅读体验和整体视觉人工验收未完成而结束。本合同不重开内容改版。
- 下一门禁：用户明确授权执行；执行前确认 Cloudflare Pages 项目 slug 和 GitHub 仓库名，并据此确定正式 URL。
- 规模：中型。静态元数据与两个 SEO 资源文件改动简单，但首次发布还涉及 GitHub、Cloudflare Pages 与 Google Search Console 三处设置。

## 目标与决定

- 代码存放在 GitHub；Cloudflare Pages 连接该仓库并从生产分支自动发布；首发网址使用 `https://<project-slug>.pages.dev/`。
- 将“部署在 GitHub”解释为 GitHub 源码仓库，不使用 GitHub Pages 托管。`pages.dev` 是 Cloudflare Pages 域名；直接使用 GitHub Pages 会得到 `github.io` 网址。
- 项目 slug 暂建议 `audiobook-speed-calculator`，创建 Cloudflare 项目时确认可用；若不可用，先选定实际 slug，再生成所有绝对 URL。
- 目标读者为美国英语用户。页面语言标记改为 `en-US`，保留清晰的美式英文内容；日期格式化函数现已使用 `en-US`，不另造格式化逻辑。
- Google 依据可见内容识别页面语言；`lang="en-US"` 是语义与无障碍标记，不作为地域排名保证。单一语言版本不添加 hreflang 或地理 meta 标签；`pages.dev` 也不代表美国专属域名。以后增加地区/语言版本时再使用独立 URL 和 hreflang。
- 在 `<head>` 加入指向唯一正式首页的 self-canonical。新增 `robots.txt`，允许抓取并列出站点地图；新增只包含正式首页的 `sitemap.xml`。单页站点的 sitemap 是发现提示，不保证收录或排名；不伪造 `lastmod`。
- Search Console 使用 URL-prefix 属性 `https://<project-slug>.pages.dev/`；在 `index.html` 放置站点所有者从 Google 生成的 `google-site-verification` meta token，部署后验证所有权、提交 sitemap，并用 URL Inspection 检查实时页面和请求抓取。
- 不把固定关键词密度当成 Google 技术要求或本合同验收项；本轮不改写已完成的页面文案。

## 修改范围

- 允许：`site/dist/index.html`（含 canonical、`lang="en-US"`，以及用户提供的 Search Console 验证 token）、新增 `site/dist/robots.txt`、新增 `site/dist/sitemap.xml`、本计划状态。
- 禁止：修改计算器逻辑、样式、FAQ 或内容结构；添加依赖、服务端、Analytics、GitHub Pages 工作流或 Cloudflare Functions；自定义域名、双平台重复托管、远端写入或提交推送不属于本轮计划文档修改。
- 当前工作区没有 Git 仓库。后续首次发布须建立或指定 GitHub 仓库并推送项目文件；本项目无构建步骤，Cloudflare 只发布 `site/dist`，仓库中的 README、测试和计划文件不会被部署到网站。

## 发布建议

1. 建立 GitHub 仓库。默认可保持私有，除非希望公开源代码；网站仍会公开访问。仓库保留 `README.md`、`plan.md`、`site/` 和测试文件。
2. 在 Cloudflare Pages 选择 Connect to Git，授权 GitHub 访问目标仓库；仓库根目录保持默认，生产分支选 `main`，构建命令留空，输出目录设为 `site/dist`。推送到生产分支后自动发布，非生产分支可用预览部署。
3. 使用 Cloudflare 创建的 `<project-slug>.pages.dev` 作为唯一生产网址。当前不启用 GitHub Pages，避免产生第二个公开站点地址与重复内容。
4. 在 Search Console 添加上述 URL-prefix 属性；所有者生成验证 meta token 后放入 `index.html` 并重新发布，完成验证后提交 `/sitemap.xml`，检查 `/`、`/robots.txt`、`/sitemap.xml` 均可从公开网络访问。
5. 如后续绑定自有域名，将自有域名设为新的 canonical，更新 sitemap 与 robots.txt，并把旧 `pages.dev` 网址重定向至唯一正式域名。

## 验收矩阵

| 场景 | 通过标准 | 证明方式 |
| --- | --- | --- |
| 页面元数据 | HTML 为 `lang="en-US"`；canonical 精确等于最终首页 URL；现有 title、description 和可见英文内容保留；无 `noindex` | 源码检查；部署后 URL Inspection |
| robots 与 sitemap | `/robots.txt` 和 `/sitemap.xml` 返回 200；robots 允许抓取并给出绝对 sitemap URL；XML 语法正确，只有 canonical 首页 URL | 本地静态检查与 `curl`；Search Console sitemap 报告 |
| GitHub 到 Pages | 推送 `main` 后 Cloudflare Pages 成功部署 `site/dist`；`<project-slug>.pages.dev` 首页和本地 CSS/JS 均可访问 | Cloudflare 部署状态及公开 URL 检查 |
| 搜索发现 | Search Console URL-prefix 属性验证成功，sitemap 被接受，URL Inspection 能读取实时首页 | Search Console；抓取/收录时间不作保证 |
| 美国英语目标 | 页面可见内容使用美国英语，日期显示沿用现有 `en-US` 格式；不声称 `pages.dev` 或语言标记能单独锁定美国排名 | 源码/页面核对；Search Console 按国家观察表现 |

## 执行步骤与验证

1. 复核 `site/dist/index.html`、README 与现有测试入口。页面是原生 HTML/CSS/ES modules，`site/dist` 是直接发布目录，无构建步骤；日期函数已使用 `Intl.DateTimeFormat("en-US")`，不新增平行格式化逻辑。
2. 确认实际 Cloudflare project slug；在 `index.html` 设置 `lang="en-US"` 和正式首页 canonical，在 `site/dist/robots.txt` 写入 `User-agent: *`、`Allow: /` 与绝对 sitemap 地址，在 `site/dist/sitemap.xml` 仅列出该首页。
3. 按上述配置连接 GitHub 仓库与 Cloudflare Pages，生成生产部署；不要同时配置 GitHub Pages。
4. 检查首页及两个 SEO 文件的 HTTP 状态、canonical/sitemap URL 一致性、XML 解析和本地模块资源可达性；完成 Search Console 验证、提交和 URL Inspection。Google 收录时间与排名不作保证。

验证命令模板（先把占位 slug 替换为实际项目名）：

```sh
SITE_URL='https://<project-slug>.pages.dev'
export SITE_URL
curl -fsS "${SITE_URL}/" -o /dev/null
curl -fsS "${SITE_URL}/robots.txt"
curl -fsS "${SITE_URL}/sitemap.xml"
python3 -c 'import os, urllib.request, xml.etree.ElementTree as ET; ET.fromstring(urllib.request.urlopen(os.environ["SITE_URL"] + "/sitemap.xml").read())'
```

## 权威来源与未覆盖风险

- Google：[canonical 与 JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)、[sitemap 概览](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)、[Search Console 入门](https://developers.google.com/search/docs/monitor-debug/search-console-start)、[多地区网站指南](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)。
- Cloudflare：[Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)、[构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)。
- Cloudflare 项目 slug、GitHub 仓库名称及 Search Console 验证令牌尚未确定；它们是实际写入绝对 URL 和完成发布的前置条件。
- Google 说明站点地图只是抓取提示，且不会保证收录或排名。`pages.dev` 是通用域名；美国目标效果仍取决于页面内容及其他地区信号，需发布后观察 Search Console 数据。
- 最终实现、公开部署和 Search Console 结果：待执行后填写。实际手机验收仍归前序合同，未完成而结束。
