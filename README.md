# 大连奶龙大学

> 代码写向未来，快乐交给奶龙。

线上地址：[大连奶龙大学.com](https://xn--pssa0vz4e155inzt.com/)（Punycode：`xn--pssa0vz4e155inzt.com`）

以大连东软信息学院校园为灵感的**非官方趣味创作**单页站点。所设学院、课程、新闻均为虚构，不提供任何真实招生、缴费、学籍或学位服务，与大连东软信息学院及奶龙角色版权方无隶属关系。

## 页面内容

| 板块 | 锚点 | 说明 |
|---|---|---|
| 首屏 | `#home` | 主视觉、两个入口按钮、校园快讯条 |
| 学校概况 | `#about` | 灵感来源介绍、趣味校训「精勤博学，吃饱再学」 |
| 学院设置 | `#colleges` | 六大脑洞学院卡片，点击进入各学院独立介绍页 |
| 校园生活 | `#campus` | 三张校园漫游卡片，点击弹出图文导览 |
| 奶龙要闻 | `#news` | 四条趣味新闻，可按「校园动态 / 学术脑洞 / 生活灵感」筛选 |
| 入学指南 | `#join` | 入学纪念卡预览与领取入口 |
| 真实东软 · 学生组织 | `#clubs` | 三家真实存在的学生技术组织卡片，点击进入 [clubs.html](clubs.html) |
| 同学投稿 | `#submissions` | 三条最新投稿的推荐位，点击进入 [submissions.html](submissions.html) |
| 常见问题 | — | 三条 FAQ（`<details>` 折叠） |

## 真实学生组织页

`clubs.html` 是一个独立页面，介绍三家**真实存在**的学生技术组织：大连东软网络安全工作室（NSS）、微光网络工作室、ACM 编程爱好者社。它与本站的虚构内容严格分开，页首就用「真实与虚构」对照区划清边界。

这一页的特殊约束（改文案前请先读）：

- **来源分层**：每条事实都标来源层级。`官方已核实`＝学校官网或学院官网可查；`一手自述`＝组织自己的站点；`非官方`＝只见于学生整理资料。非官方内容单独列出，不与官方信息混排。
- **禁止编造**：查不到公开信息的项目（NSS 字母全称、成立时间、规模、公众号；ACM 与 NSS 的人数）一律不写，不推测、不代填。
- **域名辨析**：`neusoft.edu.cn` 是学校官方域名；`dnui.cc` 是学生自建域名，`acm.dnui.cc`、`nss.dnui.cc`、`survive.dnui.cc` 都不是官方站。三个组织里只有 `shimmer.neusoft.edu.cn` 在学校官方域名下。
- **不搬用素材**：不使用学校校徽与学校 Logo，不取用各组织站点的图片。
- **引用纪律**：引用「DNUIer 的生存指南」需署名「DNUI Survival Guide 贡献者」并注明 MIT；对它的做法是改写与事实性转述，不整段照搬。

## 同学投稿页

`submissions.html` 展示同学们自己写的、拍的、做的东西。投稿是**真人真事**，页面首屏就用「这一页是什么 / 不是什么」对照区和虚构内容划清边界。

**这一页是生成出来的，不要直接改 `submissions.html`。** 每次改投稿内容后重新生成再提交：

```bash
node tools/build-submissions.mjs
```

生成器会读 `content/submissions/*.json`，重写 `submissions.html`，并同步更新首页里两对标记之间的内容：`<!-- submissions:start -->` 与 `<!-- submissions:end -->` 之间是最新三张推荐卡（一条投稿都没有时换成「怎么投稿」的入口），`<!-- bulletin:start -->` 与 `<!-- bulletin:end -->` 之间是顶部快讯条（有真实投稿就播报最新一条，只有示例或一条都没有时回到固定文案）。它还会给 `sitemap.xml` 里跟着投稿变动的两个地址（首页与投稿页）写 `lastmod`，日期取最新一条投稿的日期；一条投稿都没有时把 `lastmod` 删掉。校验不通过会直接报错，不会写出半个页面。

**忘了重新生成会被拦下来。** `.github/workflows/verify.yml` 在每个 PR 和每次推送到 `main` 时重新跑一遍生成器，再比对提交里的页面：生成物跟 `content/submissions/*.json` 对不上（漏跑生成器，或者手改了 `submissions.html`）就会失败，日志里会打印缺的差异。

**收到一条新投稿**

在 `content/submissions/` 下新建一个 JSON 文件，一条一个文件，文件名建议 `日期-短标题.json`：

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 唯一标识，只用小写字母、数字和连字符；页面上 `#s-{id}` 就是这条的锚点 |
| `title` | ✅ | 标题 |
| `author` | ✅ | 投稿人自选的昵称，**不写真实姓名** |
| `date` | ✅ | 投稿日期，`YYYY-MM-DD` |
| `category` | ✅ | `writing` 文字故事 / `work` 作品分享 / `photo` 影像记录 / `note` 随手一句 |
| `college` | — | `code` `ai` `design` `business` `language` `health` 之一，不挂学院就省略 |
| `summary` | ✅ | 一句话摘要，用在首页推荐卡上 |
| `paragraphs` | ✅ | 正文段落数组，一段一个字符串 |
| `tags` | — | 标签数组 |
| `image` / `imageAlt` | — | 图片路径（放进 `assets/`）与图说；**必须成对出现** |
| `license` | — | 授权方式，默认 `CC BY-NC-SA 4.0` |
| `consent` | ✅ | 必须是 `true`，表示投稿人已同意公开展示 |
| `sample` | — | 演示用的占位内容标记为 `true`，页面上会显示「示例」角标 |

投稿模板在 `.github/ISSUE_TEMPLATE/submission.yml`，想投稿的同学可以直接开 Issue 填写，维护者再整理成 JSON。

**投稿页的内容约束**

- **不加后端**：站点没有任何网络请求、Cookie 和 `localStorage`，投稿不经过服务器，全部靠重新构建发布。
- **只用昵称**：真实姓名、学号、手机号、宿舍门牌、未公开的聊天记录一律不收，正文里写到同学也要用昵称或模糊说法。
- **本人同意**：`consent` 为 `false` 的投稿生成器会直接拒绝。
- **可撤回**：撤稿就是删掉对应的 JSON 再重新生成，页面和首页推荐位会一起更新。
- `content/` 与 `tools/` 在 `.gitattributes` 里标了 `export-ignore`，只在仓库里用，**不会进入线上产物**——线上只有生成好的 `submissions.html`。

## 功能

- **入学纪念卡**：填写昵称（≤12 字）并选择学院，在浏览器本地生成纪念卡，可下载为 SVG。卡号格式 `DNLU-xxxxxx-xxxx`，由时间戳加 `crypto.getRandomValues` 随机数组成。昵称不上传、不存储，嵌入 SVG 前经过 XML 转义。
- **详情弹窗**：要闻、校园导览共用原生 `<dialog>`，关闭后焦点回到触发按钮。
- **新闻筛选**：按 `data-category` 过滤，按钮状态用 `aria-pressed` 标记。
- **投稿筛选**：同学投稿页复用同一套筛选逻辑，分类为文字故事 / 作品分享 / 影像记录 / 随手一句。
- **移动端导航**：汉堡菜单，760px 以下启用。
- **回到顶部**：滚动超过 600px 后出现。
- 系统开启「减少动态效果」（`prefers-reduced-motion`）时，关闭平滑滚动和动画。

站点没有任何网络请求、Cookie、`localStorage` 和第三方统计脚本。

## 目录结构

```
.
├── index.html        # 页面结构与全部静态文案
├── clubs.html        # 真实东软 · 学生组织（NSS / 微光 / ACM），独立于虚构内容
├── submissions.html  # 同学投稿展示页（由 tools/build-submissions.mjs 生成，不要手改）
├── 404.html          # 地址不存在时的落点；站内链接写成根绝对路径，因为它会在任意深度被访问
├── app.js            # 交互逻辑与弹窗内容数据（原生 JS，无依赖）
├── styles.css        # 全部样式（已压缩）
├── content/
│   └── submissions/      # 投稿源文件，一条一个 JSON；不上线
├── tools/
│   └── build-submissions.mjs  # 投稿页生成器，本地运行；不上线
├── colleges/         # 六所脑洞学院的独立介绍页
│   ├── code.html         # 奶龙软件工程学院
│   ├── ai.html           # 人工智龙学院
│   ├── design.html       # 数字摸鱼艺术学院
│   ├── business.html     # 零食数字商学院
│   ├── language.html     # 龙语国际交流学院
│   └── health.html       # 健康午睡科技学院
├── assets/
│   ├── hero-campus.webp      # 首屏主视觉（AI 创作）；健康午睡科技学院页配图
│   ├── campus-overview.webp  # 学校概况配图；「漫游校园」导览弹窗配图；人工智龙学院页配图
│   ├── campus-autumn.webp    # 校园生活卡片 · 漫游校园；数字摸鱼艺术学院页配图
│   ├── campus-life.webp      # 校园生活卡片 · SOVO；SOVO 导览弹窗配图；零食数字商学院页配图；同学投稿页首屏（该页 og:image 用的也是它）
│   ├── campus-seasons.webp   # 校园生活卡片 · 四季；四季导览弹窗配图；龙语国际交流学院页配图
│   └── seal.svg              # 趣味校徽，同时作为 favicon
├── robots.txt
└── sitemap.xml
```

没有构建步骤，仓库里的文件就是线上部署的产物，改完可以直接发布。唯一的例外是同学投稿页：它由 `tools/build-submissions.mjs` 在本地从 `content/submissions/` 生成，生成的 `submissions.html` 一样提交进仓库，所以**线上跑的始终是静态文件**，部署链没有变化。

`404.html` 是访问不存在的地址时的落点：它故意不写 canonical（任意错误地址没有唯一的规范地址），改挂 `noindex`，也不进 `sitemap.xml`。要让它真正生效，服务器得把找不到的路径交给它——nginx 里是 `error_page 404 /404.html;`，换别的服务器就用对应的 404 配置。只把文件提交进仓库、服务器没配这一行的话，线上看到的仍然是服务器自带的错误页。

## 本地预览

在仓库根目录起一个静态服务器即可：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 修改指南

**改文案**

- 首页上直接可见的文字都写在 `index.html` 里；六所学院的介绍页在 `colleges/` 下，各自是独立的静态 HTML；真实学生组织页是根目录的 `clubs.html`；同学投稿页是根目录的 `submissions.html`，**不要手改**，改 `content/submissions/` 里的 JSON 后重新生成（见上节）。
- 弹窗里的长文案在 `app.js` 顶部的两个数据对象中：

  | 对象 | 对应弹窗 | key（需与 HTML 中的 `data-*` 属性一致） |
  |---|---|---|
  | `stories` | 奶龙要闻 | `welcome` `debug` `canteen` `society` → `data-story` |
  | `tours` | 校园导览 | `campus` `sovo` `seasons` → `data-tour` |

  `colleges` 对象保存六所学院的名称，供纪念卡表单校验和卡片文案使用；学院详情本身写在各学院页里。

  新增学院时，需要同步修改四处：`colleges` 对象、`#colleges` 中的卡片、`colleges/` 下新建的页面、纪念卡表单里 `#student-college` 的 `<option>`。

**缓存版本号**

`index.html` 引用 `styles.css`、`app.js` 时带了版本参数 `?v=N`。线上静态资源有 1 小时缓存，修改 CSS/JS 后要把对应的 `N` 加 1，否则用户可能拿到旧文件。`index.html` 本身不缓存。

**内容安全策略（CSP）**

线上响应头带有如下 CSP，**改代码时必须遵守**，否则功能会在线上静默失效（本地预览不会报错）：

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'
```

这意味着：

- 不能写内联 `<script>` 或 `onclick=` 这类内联事件，脚本只能放在 `app.js` 里。
- 不能写内联 `<style>` 或 `style=""` 属性，样式只能放在 `styles.css` 里。
- 不能引用外部 CDN 的脚本、样式、字体或图片，所有资源都要放进本仓库。
- 表单不能提交到任何地址（`form-action 'none'`），纪念卡表单靠 JS 拦截 `submit` 来处理。

## 部署

**推送到 `main` 即自动上线**，约 1 分钟生效，由 `.github/workflows/deploy.yml` 完成：

1. GitHub Actions 用 `git archive` 打包。`.gitattributes` 中标了 `export-ignore` 的文件（README、CONTRIBUTING、`.github` 等）不会进入线上。
2. 通过 SSH 把包交给服务器上的发布脚本。部署账号的密钥被限定为只能执行这个脚本：拿不到 shell，也不能做端口转发。
3. 发布脚本校验包：拒收软链、绝对路径、`..` 路径、缺少 `index.html` 的包，以及超过 50MB 的包。
4. 校验通过后，解压到新的版本目录，以 `日期-序号` 命名，如 `20261015-01`；目录里的 `.revision` 记录对应的提交号，对外不可访问。然后原子切换 `current` 软链。
5. 切换后请求一次源站首页，核对内容。**不一致或打不开，就自动切回上一版**，并删除这个失败的版本。
6. 只保留最近 5 个版本，更早的自动清理。

其他说明：

- 只改 `README.md`、`CONTRIBUTING.md`、PR 模板、`content/` 或 `tools/` 的推送不触发部署——也就是说，漏跑生成器不会有部署报错，这一层由 `.github/workflows/verify.yml`（校验）兜住。需要重新发布时，可以在 Actions 页面手动运行「部署到线上」。
- 同一时间只会有一个部署在跑，后来的排队等候。
- 想回滚到更早的版本，需要登录服务器手动切换 `current` 软链。
- 部署用到的 Secrets：`DEPLOY_SSH_KEY`、`DEPLOY_HOST`、`DEPLOY_KNOWN_HOSTS`。服务器地址和密钥都不在代码里。

站点前面有 CDN，HTTPS 由 CDN 终止。发布后如果线上没更新，需要刷新 CDN 缓存。修改 CSS/JS 时记得递增 `?v=`。

服务器还需要配置这些响应头：上节的 CSP、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`X-Frame-Options: SAMEORIGIN`。缓存规则是：`index.html` 设为 `no-store`，静态资源缓存 1 小时。

## 参与修改

分支、提交信息、PR 的约定和改动自查项见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 素材与版权

- 校园实景图片来自[大连东软信息学院官网](https://www.neusoft.edu.cn/)，主题校园图为 AI 创作，相关素材权利归原权利人所有。
- 页面风格参考 [奶龙大学](https://www.milkdragonuniversity.me/)。
- 「奶龙」角色版权归其版权方所有，本站为非商业趣味创作。
