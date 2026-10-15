/**
 * 同学投稿生成器
 *
 * 用法（在仓库根目录执行）：
 *   node tools/build-submissions.mjs
 *
 * 它做三件事：
 *   1. 读取 content/submissions/*.json，逐条校验；
 *   2. 生成 submissions.html（投稿展示页）；
 *   3. 把首页 <!-- submissions:start --> 与 <!-- submissions:end --> 之间的
 *      推荐位替换成最新几条投稿。
 *
 * 站点是纯静态的：这个脚本只在本地跑，产物是要提交进仓库的 HTML。
 * 发布仍然靠「推送到 main → Actions 打包上线」，部署链没有任何改动。
 *
 * 页面外壳（顶栏、页脚、版本号）直接从 clubs.html 抄，保证全站一致。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'submissions');
const TEMPLATE = path.join(ROOT, 'clubs.html');
const OUTPUT = path.join(ROOT, 'submissions.html');
const HOMEPAGE = path.join(ROOT, 'index.html');

const SITE = 'https://xn--pssa0vz4e155inzt.com';
const HOMEPAGE_TEASER_COUNT = 3;

/** 分类：key 写到 data-category，label 用于展示与筛选按钮。 */
const CATEGORIES = [
  { key: 'writing', label: '文字故事' },
  { key: 'work', label: '作品分享' },
  { key: 'photo', label: '影像记录' },
  { key: 'note', label: '随手一句' }
];

const COLLEGE_NAMES = {
  code: '奶龙软件工程学院',
  ai: '人工智龙学院',
  design: '数字摸鱼艺术学院',
  business: '零食数字商学院',
  language: '龙语国际交流学院',
  health: '健康午睡科技学院'
};

const LICENSE_DEFAULT = 'CC BY-NC-SA 4.0';

/* ---------------------------------------------------------------- 工具 */

const escapeHTML = (value) =>
  String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttr = (value) => escapeHTML(value).replace(/"/g, '&quot;');

const fail = (file, message) => {
  throw new Error(`content/submissions/${file}：${message}`);
};

const isPlainString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * 读 WebP 的真实像素尺寸。
 * 全站约定：<img> 必须写 width/height，否则自检脚本会拦下来。
 * 支持 VP8X（扩展）、VP8（有损）、VP8L（无损）三种头。
 */
const imageSizeCache = new Map();
function readImageSize(relativePath) {
  if (imageSizeCache.has(relativePath)) return imageSizeCache.get(relativePath);

  const buffer = fs.readFileSync(path.join(ROOT, relativePath));
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`image「${relativePath}」不是可识别的 WebP 文件，请在 JSON 里写清尺寸或换一张图。`);
  }

  const format = buffer.toString('ascii', 12, 16);
  let size = null;

  if (format === 'VP8X') {
    size = { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  } else if (format === 'VP8 ') {
    size = { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  } else if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    size = { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (!size || !size.width || !size.height) {
    throw new Error(`image「${relativePath}」的 WebP 头无法解析出尺寸。`);
  }

  imageSizeCache.set(relativePath, size);
  return size;
}

/** 2026-10-06 → 2026.10.06；同时校验日期真实存在。 */
const formatDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return null;
  }
  return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
};

/* ---------------------------------------------------------- 读取与校验 */

function loadSubmissions() {
  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error('找不到 content/submissions/ 目录。');
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.json')).sort();
  const seenIds = new Set();
  const items = [];

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
    } catch (error) {
      fail(file, `JSON 解析失败 —— ${error.message}`);
    }

    for (const field of ['id', 'title', 'category', 'author', 'date', 'summary']) {
      if (!isPlainString(raw[field])) fail(file, `缺少必填字段 ${field}。`);
    }

    const id = raw.id.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      fail(file, `id「${id}」只能用小写字母、数字和连字符。`);
    }
    if (seenIds.has(id)) fail(file, `id「${id}」与另一条投稿重复。`);
    seenIds.add(id);

    if (!CATEGORIES.some((category) => category.key === raw.category)) {
      fail(file, `category「${raw.category}」不在允许范围：${CATEGORIES.map((c) => c.key).join(' / ')}。`);
    }

    const displayDate = formatDate(String(raw.date).trim());
    if (!displayDate) fail(file, `date「${raw.date}」不是合法的 YYYY-MM-DD 日期。`);

    if (raw.college != null && !COLLEGE_NAMES[raw.college]) {
      fail(file, `college「${raw.college}」不是已知学院；不需要填就写 null。`);
    }

    if (raw.consent !== true) {
      fail(file, 'consent 必须显式为 true（投稿人已同意公开展示）。');
    }

    const paragraphs = Array.isArray(raw.paragraphs)
      ? raw.paragraphs.filter(isPlainString).map((text) => text.trim())
      : [];
    if (paragraphs.length === 0) fail(file, 'paragraphs 至少要有一段非空正文。');

    const tags = Array.isArray(raw.tags) ? raw.tags.filter(isPlainString).map((t) => t.trim()) : [];

    let image = null;
    if (raw.image != null) {
      if (!isPlainString(raw.image)) fail(file, 'image 要么是仓库内路径，要么写 null。');
      image = raw.image.trim();
      if (image.startsWith('/') || image.includes('..')) {
        fail(file, `image「${image}」必须是不含 .. 的仓库内相对路径。`);
      }
      if (!fs.existsSync(path.join(ROOT, image))) {
        fail(file, `image「${image}」在仓库里不存在。`);
      }
    }

    const imageAlt = isPlainString(raw.imageAlt) ? raw.imageAlt.trim() : '';
    if (image && !imageAlt) fail(file, '用了 image 就必须写 imageAlt。');

    items.push({
      id,
      file,
      title: raw.title.trim(),
      category: raw.category,
      categoryLabel: CATEGORIES.find((c) => c.key === raw.category).label,
      author: raw.author.trim(),
      college: raw.college == null ? null : raw.college,
      date: displayDate,
      sortKey: String(raw.date).trim(),
      summary: raw.summary.trim(),
      paragraphs,
      tags,
      image,
      imageAlt,
      license: isPlainString(raw.license) ? raw.license.trim() : LICENSE_DEFAULT,
      sample: raw.sample === true
    });
  }

  // 新的在前；同一天按 id 稳定排序。
  items.sort((a, b) => (a.sortKey === b.sortKey ? a.id.localeCompare(b.id) : b.sortKey.localeCompare(a.sortKey)));
  return items;
}

/* ------------------------------------------------------------ 渲染片段 */

const SAMPLE_BADGE = '<span class="source-tag is-unofficial" title="示例内容，用于展示投稿界面">示例</span>';

function renderCard(item) {
  const author = [`投稿人：${escapeHTML(item.author)}`];
  if (item.college) author.push(escapeHTML(COLLEGE_NAMES[item.college]));

  const parts = [];
  parts.push(`      <article class="submission-card" id="s-${escapeAttr(item.id)}" data-category="${escapeAttr(item.category)}">`);
  parts.push('        <div class="submission-top">');
  parts.push(`          <span class="tiny-label">${escapeHTML(item.date)} · ${escapeHTML(item.categoryLabel)}</span>`);
  parts.push(`          ${item.sample ? SAMPLE_BADGE : `<span class="source-tag is-self">已授权</span>`}`);
  parts.push('        </div>');
  parts.push(`        <h3>${escapeHTML(item.title)}</h3>`);
  parts.push(`        <p class="submission-by">${author.join(' · ')}</p>`);
  parts.push('        <div class="submission-text">');
  for (const paragraph of item.paragraphs) {
    parts.push(`          <p>${escapeHTML(paragraph)}</p>`);
  }
  parts.push('        </div>');
  if (item.image) {
    const size = readImageSize(item.image);
    parts.push('        <figure class="submission-figure">');
    parts.push(`          <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.imageAlt)}" width="${size.width}" height="${size.height}" loading="lazy" decoding="async">`);
    parts.push(`          <figcaption>${escapeHTML(item.imageAlt)} · 投稿人提供</figcaption>`);
    parts.push('        </figure>');
  }
  if (item.tags.length > 0) {
    parts.push(`        <p class="submission-tags">标签：${item.tags.map(escapeHTML).join(' · ')} · 授权：${escapeHTML(item.license)}</p>`);
  } else {
    parts.push(`        <p class="submission-tags">授权：${escapeHTML(item.license)}</p>`);
  }
  parts.push('      </article>');
  return parts.join('\n');
}

function renderFilterButtons(items) {
  const used = new Set(items.map((item) => item.category));
  const buttons = [`<button data-filter="all" aria-pressed="true">全部</button>`];
  for (const category of CATEGORIES) {
    if (!used.has(category.key)) continue;
    buttons.push(`<button data-filter="${category.key}" aria-pressed="false">${category.label}</button>`);
  }
  return `<div class="news-filters" role="group" aria-label="筛选同学投稿">${buttons.join('')}</div>`;
}

function renderTeaser(item) {
  const meta = [item.author, item.college ? COLLEGE_NAMES[item.college] : null].filter(Boolean).join(' · ');
  return [
    `      <a class="submission-teaser" href="submissions.html#s-${escapeAttr(item.id)}">`,
    `        <span class="tiny-label">${escapeHTML(item.date)} · ${escapeHTML(item.categoryLabel)}</span>`,
    `        <h3>${escapeHTML(item.title)}</h3>`,
    `        <p>${escapeHTML(item.summary)}</p>`,
    `        <span class="submission-teaser-bottom">${escapeHTML(meta)}</span>`,
    '      </a>'
  ].join('\n');
}

/* -------------------------------------------------------- 页面正文生成 */

function buildMain(items) {
  const sampleCount = items.filter((item) => item.sample).length;
  const listInner = items.length > 0
    ? `    <div class="submission-grid">\n${items.map(renderCard).join('\n')}\n    </div>`
    : `    <p class="submission-empty">还没有发布出来的投稿。第一封留给你。</p>`;

  return `  <section class="college-hero" aria-labelledby="submissions-title">
    <img class="college-hero-image" src="assets/campus-life.webp" width="1280" height="719" alt="群山之间的现代校园与晚霞" fetchpriority="high">
    <div class="college-hero-shade"></div>
    <div class="college-hero-content">
      <a class="college-back" href="index.html">← 返回首页</a>
      <p class="eyebrow light"><span></span> 同学投稿 / NOTES FROM CLASSMATES</p>
      <h1 id="submissions-title">这里放的，<br>是同学们自己写的东西</h1>
      <p class="college-hero-motto">虚构的大学里，装着真实的人写下的真实的事。</p>
      <p class="college-hero-desc">一段踩坑记录、一个小工具、几张秋天拍的照片，或者只是一句想说的话。投稿都经过本人同意才放上来，署名用投稿人自己选的昵称；不想露脸的就只留昵称，不写真实姓名、学号和联系方式。</p>
      <div class="college-hero-tags"><span>本人同意后发布</span><span>只用昵称署名</span><span>改了哪里会说明</span></div>
    </div>
  </section>
  <nav class="college-subnav" aria-label="本页导航"><div class="container"><ul><li><a href="#intro">这一页是什么</a></li><li><a href="#list">全部投稿</a></li><li><a href="#how">怎么投稿</a></li><li><a href="#rules">投稿须知</a></li></ul></div></nav>
  <section class="section" id="intro" aria-labelledby="intro-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow">01 / WHAT THIS IS</p><h2 id="intro-title">先把这一页说清楚</h2></div><p>它不是新闻，<br>也不是官方发布。</p></div>
    <div class="real-compare">
      <div class="is-real"><h3>这一页是什么</h3><ul><li>同学们自己写的、自己拍的、自己做的东西，原文刊登</li><li>署名是投稿人自己选的昵称，发布前经过本人同意</li><li>每一条都能看到是谁投的、什么时候投的、用什么授权</li><li>想改或者想撤，随时可以提出来，撤下来的稿子会从页面上移除</li></ul></div>
      <div class="is-fiction"><h3>这一页不是什么</h3><ul><li>不是学校官方发布，不代表大连东软信息学院的立场</li><li>不是「奶龙要闻」——那边的故事是虚构的，这边的人是真实的</li><li>不是文学比赛，没有门槛，写清楚一件小事就够了</li><li>不放真实姓名、学号、手机号和宿舍门牌，这些一律不收</li></ul></div>
    </div>
    <p class="college-note">投稿页面里出现的个人观点只属于投稿人本人。凡是能核实的事实性内容，引用时请回到原始来源；本站不代替任何官方渠道答疑。</p>
  </div></section>
  <section class="section" id="list" aria-labelledby="list-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow">02 / ALL SUBMISSIONS</p><h2 id="list-title">全部投稿</h2></div>${renderFilterButtons(items)}</div>
${listInner}
    <p class="section-footnote">按投稿日期从新到旧排列。筛选按钮可以用 Tab 键聚焦、回车或空格切换。</p>
  </div></section>
  <section class="section" id="how" aria-labelledby="how-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow">03 / HOW TO SUBMIT</p><h2 id="how-title">怎么投稿</h2></div><p>投一次就够了，<br>不用先写得很好。</p></div>
    <div class="college-grid-3">
      <article class="work-card"><span class="tiny-label">STEP 01</span><h3>在仓库提一个 Issue</h3><p>打开本站的 <a href="https://github.com/zp-home/dalian-nailong/issues" target="_blank" rel="noopener noreferrer">GitHub 仓库</a>，选「同学投稿」模板，把想说的话写进去。不会用 Git 也没关系，按模板填就行。</p><p class="course-meta">写不完整也没事，漏掉的部分维护者会来问。</p></article>
      <article class="work-card"><span class="tiny-label">STEP 02</span><h3>或者直接提一个 PR</h3><p>在 <code>content/submissions/</code> 下新建一个 JSON 文件，照着已有文件的字段填：标题、昵称、日期、正文、授权。图片放进 <code>assets/</code> 并在 JSON 里引用。</p><p class="course-meta">一条投稿一个文件，改起来清楚，也方便回退。</p></article>
      <article class="work-card"><span class="tiny-label">STEP 03</span><h3>合并后重新构建发布</h3><p>维护者在本地跑 <code>node tools/build-submissions.mjs</code>，把投稿渲染成静态页面并提交。合并进 <code>main</code> 之后，线上大约一分钟就会更新。</p><p class="course-meta">站点本身没有任何后端，投稿不经过服务器，全靠重新构建发布。</p></article>
    </div>
  </div></section>
  <section class="section" id="rules" aria-labelledby="rules-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow">04 / BEFORE YOU SEND IT</p><h2 id="rules-title">投稿须知</h2></div><p>几件先说好的事，<br>免得后面麻烦。</p></div>
    <div class="graduation-panel">
      <span class="tiny-label">四条约定</span>
      <blockquote>写你自己的事，用你自己的话。</blockquote>
      <p><strong>一、必须是原创。</strong>文字、照片、代码都请自己写、自己拍、自己做。引用别人的内容要写明出处，不要整段搬过来。</p>
      <p><strong>二、同意公开展示。</strong>提交即表示同意本站以你选的昵称署名发布，并采用你指定的授权方式（默认 CC BY-NC-SA 4.0）。</p>
      <p><strong>三、不写别人的隐私。</strong>真实姓名、学号、手机号、宿舍门牌、未公开的群聊记录一律不要出现在投稿里；写到同学时请用昵称或模糊说法。</p>
      <p><strong>四、随时可以撤回。</strong>投稿发布后如果改变主意，在仓库里说一声，维护者会把这一条从页面上移除并重新发布。</p>
    </div>
    <p class="college-note">当前页面上标着「示例」的条目，是为了把界面演示清楚而放的占位内容，不是真实投稿；收到第一条真实投稿后就会被替换掉。投稿里如果有事实性错误，欢迎在 <a href="https://github.com/zp-home/dalian-nailong/issues" target="_blank" rel="noopener noreferrer">GitHub 仓库</a>指出，我们改完会重新发布。</p>${sampleCount > 0 ? '' : ''}
  </div></section>
  <section class="section" id="sources" aria-labelledby="sub-sources-title"><div class="container">
    <div class="section-head"><div><p class="eyebrow">05 / SOURCES &amp; CREDITS</p><h2 id="sub-sources-title">来源与引用</h2></div><p>这一页的内容从哪来，<br>以及怎么署名。</p></div>
    <div class="real-compare">
      <div class="is-real"><h3>内容从哪来</h3><ul><li>正文、图片与标签均由投稿人提供，发布前经过本人同意</li><li>稿件的原始记录保存在仓库的 <code>content/submissions/</code> 目录，一条一个文件</li><li>本页的正文由 <code>tools/build-submissions.mjs</code> 从这些文件生成，不手工改写</li><li>想核对某一条投稿的原文，可以在仓库历史里找到对应的提交</li></ul></div>
      <div class="is-fiction"><h3>引用与授权</h3><ul><li>每一条投稿都标注了授权方式，默认 <strong>CC BY-NC-SA 4.0</strong>；投稿人可以指定别的许可</li><li>转载时请署名投稿人的昵称，并保留原文链接与授权说明</li><li>投稿中的图片由投稿人提供，除非另有说明，不随正文本站二次授权</li><li>本页不搬用学校校徽、学校 Logo 与各组织的素材</li></ul></div>
    </div>
    <p class="college-note">大连奶龙大学是一个非官方的校园趣味创作站点，与大连东软信息学院及奶龙角色版权方均无隶属关系。同学投稿只代表投稿人本人的观点和经历，不代表本站立场，也不代表学校立场。若某条内容涉及你的权益，请通过 <a href="https://github.com/zp-home/dalian-nailong" target="_blank" rel="noopener noreferrer">GitHub 仓库</a>联系我们，核实后会重新发布或移除。</p>
    <nav class="college-pager" aria-label="页面导航"><a href="clubs.html"><span>← 上一页</span><strong>真实东软 · 学生组织</strong></a><a class="is-next" href="index.html#colleges"><span>去看看虚构的那一半 →</span><strong>六所脑洞学院</strong></a></nav>
  </div></section>`;
}

/* ------------------------------------------------------------ 外壳拼装 */

function buildPage(items) {
  const reference = fs.readFileSync(TEMPLATE, 'utf8');

  const description = `大连奶龙大学的同学投稿展示页：${items.length} 篇由同学本人写作、拍摄或制作的原创内容，署名用投稿人自选的昵称，逐条标注授权方式，经本人同意后发布。`;
  const canonical = `${SITE}/submissions.html`;
  const pageTitle = `同学投稿 · 大连奶龙大学`;
  const ogDescription = '虚构的大学里，装着真实的人写下的真实的事：同学们自己写的踩坑记录、小工具与照片。';

  let head = reference.slice(0, reference.indexOf('</head>'));
  const swap = (pattern, replacement, label) => {
    if (!pattern.test(head)) throw new Error(`clubs.html 的 <head> 里找不到${label}，无法生成。`);
    head = head.replace(pattern, () => replacement);
  };

  swap(/<title>[\s\S]*?<\/title>/, `<title>${escapeHTML(pageTitle)}</title>`, '标题');
  swap(/<meta name="description" content="[\s\S]*?">/, `<meta name="description" content="${escapeAttr(description)}">`, '描述');
  swap(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeAttr(canonical)}">`, 'canonical');
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(pageTitle)}">`, 'og:title');
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(ogDescription)}">`, 'og:description');
  head += '</head>';

  const bodyStart = reference.indexOf('<body>');
  const headerEnd = reference.indexOf('</header>') + '</header>'.length;
  if (bodyStart < 0 || headerEnd < '</header>'.length) throw new Error('clubs.html 结构异常，找不到 <body> 或 </header>。');
  const top = reference.slice(bodyStart, headerEnd);

  const mainEnd = reference.indexOf('</main>');
  if (mainEnd < 0) throw new Error('clubs.html 结构异常，找不到 </main>。');
  const bottom = reference.slice(mainEnd);

  return `${head}\n${top}\n<main id="main">\n${buildMain(items)}\n${bottom}`;
}

/* ------------------------------------------------------- 首页推荐位替换 */

const MARKER_START = '<!-- submissions:start -->';
const MARKER_END = '<!-- submissions:end -->';

function updateHomepage(items) {
  const html = fs.readFileSync(HOMEPAGE, 'utf8');
  const start = html.indexOf(MARKER_START);
  const end = html.indexOf(MARKER_END);
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`index.html 里找不到成对的 ${MARKER_START} / ${MARKER_END} 标记，无法更新首页推荐位。`);
  }

  const teasers = items.slice(0, HOMEPAGE_TEASER_COUNT);
  const inner = teasers.length > 0
    ? `    <div class="college-grid-3">\n${teasers.map(renderTeaser).join('\n')}\n    </div>`
    : `    <p class="submission-empty">还没有发布出来的投稿。第一封留给你。</p>`;

  const block = [
    MARKER_START,
    inner,
    `    <a class="text-link" href="submissions.html">看看全部投稿 <span aria-hidden="true">↗</span></a>`,
    `    ${MARKER_END}`
  ].join('\n');

  const next = html.slice(0, start) + block + html.slice(end + MARKER_END.length);
  if (next !== html) {
    fs.writeFileSync(HOMEPAGE, next, 'utf8');
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ 主流程 */

const items = loadSubmissions();
const page = buildPage(items);
fs.writeFileSync(OUTPUT, page, 'utf8');

const homepageChanged = updateHomepage(items);

const sampleCount = items.filter((item) => item.sample).length;
console.log(`投稿条数：${items.length}（其中示例 ${sampleCount} 条）`);
console.log(`已生成 submissions.html（${page.length} 字符）`);
console.log(`首页推荐位：${homepageChanged ? '已更新' : '无变化'}`);
if (sampleCount > 0) {
  console.log('提示：示例内容仅用于演示界面，收到真实投稿后请把 content/submissions/ 下的 sample-*.json 删掉再重新生成。');
}
