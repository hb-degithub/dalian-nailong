# 贡献与提交规范

## 流程

1. 从 `main` 拉分支，分支名 `type/kebab-topic`，如 `feat/friend-link-dnui-survive`。
2. 改完开 PR 到 `main`，按模板逐项自查。
3. 合并方式不限。PR 标题和提交信息用同一套格式。
4. 合并到 `main` 即自动上线（见 README「部署」一节）。

## 提交信息

格式：`type(dalian-nailong): 做了什么`

| type | 用于 |
|---|---|
| `feat` | 用户能看到的新内容或新功能：新板块、新友链、新交互 |
| `fix` | 修线上的问题：样式错位、交互失效、文案错字 |
| `perf` | 变快或变小：压缩图片、减少请求 |
| `chore` | 用户看不到的改动：README、部署流程、删无用文件 |

`scope` 固定写 `dalian-nailong`。

**描述写效果，不写动作。** 写清楚改完之后用户看到了什么变化、改动的范围有多大：

| 好 | 不好 |
|---|---|
| `chore(dalian-nailong): 删掉没有页面引用的 campus-train.webp，线上少 249KB` | `chore: 删除图片` |
| `feat(dalian-nailong): 顶部条加友链 DNUIer 的生存指南和 GitHub 仓库入口，手机上隐藏标语、链接排成两行` | `feat: update index.html` |

## 改动自查

线上有 CSP 和 CDN 缓存，下面几条本地预览时看不出问题，上线后才会出错：

- **CSP**：不写内联 `<script>` / `<style>` / `style=""` / `onclick=`，不引用外部 CDN 资源。细则见 README「内容安全策略」。
- **缓存版本号**：改了 `styles.css` 或 `app.js`，就要把全部页面里的 `?v=N` 加 1。顶栏、页脚、版本号在全部 10 个页面保持一致（首页、`clubs.html`、`submissions.html`、`404.html`、`colleges/` 下的六个页面）。只有 `404.html` 是个例外：它会在任意深度被访问，站内链接与本站资源写的是根绝对路径（`/styles.css`、`/clubs.html`），其余页面用相对路径；改导航、页脚或版本号时两边都要改。
- **404 页**：`404.html` 要真的生效，服务器得把找不到的路径交给它（nginx 里是 `error_page 404 /404.html;`）。只改仓库里的文件不够。
- **真实学生组织页**：`clubs.html` 讲的是真实组织，改文案前先读 README「真实学生组织页」的来源分层与禁止编造约束。
- **同学投稿页**：`submissions.html` 由 `content/submissions/` 里的 JSON 经 `node tools/build-submissions.mjs` 生成，不要手改；同一个生成器还会更新首页的推荐位与快讯条、`sitemap.xml` 里两个地址的 `lastmod`、`feed.xml`（Atom 订阅源），以及投稿页分享用的 `og:image`／`twitter:image`（对成首屏那张图）。改投稿内容或页面模板都要跑一遍生成器，把生成的 HTML 与 `feed.xml` 一起提交。同一件事 CI 也会做一遍（`.github/workflows/verify.yml`），对不上就会失败。
- **分享卡片**：10 个页面都带 `og:*` 与 `twitter:*`，`twitter:card` 固定 `summary_large_image`，`og:image` 与 `twitter:image` 必须是同一张（自检脚本会查）。新增页面时照着现有页面的 `<head>` 抄一份，别忘了 `og:site_name`。
- **主屏幕图标**：`assets/icon-180.png` / `icon-192.png` / `icon-512.png` 是从 `assets/seal.svg` 导出的位图（正方形画布，四周留 4% 透明边距）。改了校徽就要重新导出这三个文件，否则「添加到主屏幕」上还是旧图标。
- **新增学院**：`app.js` 的 `colleges`、`#colleges` 卡片、`colleges/` 下新建的页面、`#student-college` 的 `<option>`，四处都要改。
- **新增或删除图片**：同步更新 README 的目录结构。
- **新增不上线的文件**（文档、配置）：在 `.gitattributes` 中标 `export-ignore`；如果只改它不需要重新部署，再加进 `deploy.yml` 的 `paths-ignore`。
