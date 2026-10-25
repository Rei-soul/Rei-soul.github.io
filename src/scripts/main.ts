// ============================================================
// 全站交互脚本（唯一入口）。
// 脚本只加载一次；DOM 初始化挂在 astro:page-load 上，
// 由 ClientRouter（View Transitions）在首次加载与每次导航后触发。
//
// 结构：主题 → 切页进度条 → 滚动系统（缓存驱动）→ 边界果冻
//      → 滚动入场 → 代码窗口 → 目录 → 页脚 → 搜索 → 移动菜单
// ============================================================
import { SITE } from '../data/site';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
 * 主题：localStorage 持久化，换页零闪烁（before-swap 预写新文档）
 * ------------------------------------------------------------ */
function currentTheme(): string {
  try {
    return localStorage.getItem('theme') || 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(root: HTMLElement) {
  root.classList.toggle('dark', currentTheme() === 'dark');
}

document.addEventListener('astro:before-swap', (e) => {
  const doc = (e as CustomEvent & { newDocument?: Document }).newDocument;
  if (doc?.documentElement) {
    applyTheme(doc.documentElement);
    doc.documentElement.classList.add('js');
  }
});

// 主题切换按钮：以按钮为圆心做圆形扩散动画
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.theme-toggle');
  if (!btn) return;
  const root = document.documentElement;
  const next = root.classList.contains('dark') ? 'light' : 'dark';

  const apply = () => {
    root.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {}
  };

  const anyDoc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };
  if (!reducedMotion() && typeof anyDoc.startViewTransition === 'function') {
    const rect = (btn as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.classList.add('theme-vt');
    const vt = anyDoc.startViewTransition(apply);
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 480, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
        );
      })
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove('theme-vt'));
  } else {
    apply();
  }
});

/* ------------------------------------------------------------
 * 站内导航进度条
 * ------------------------------------------------------------ */
(() => {
  const bar = document.getElementById('page-progress');
  if (!bar) return;

  document.addEventListener(
    'click',
    (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const a = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/#') || href === '#') return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      bar.classList.remove('done');
      bar.classList.add('loading');
    },
    { passive: true }
  );

  const finish = () => {
    if (!bar.classList.contains('loading')) return;
    bar.classList.remove('loading');
    bar.classList.add('done');
    setTimeout(() => bar.classList.remove('done'), 450);
  };
  document.addEventListener('astro:page-load', finish);
})();

/* ------------------------------------------------------------
 * 滚动系统（缓存驱动）：视差 / 导航双态 / 回顶按钮 / 阅读进度
 * 性能要点：元素引用、布局量（banner 位置、可滚动高度）只在
 * 换页与 resize 时读取一次，滚动帧内零 DOM 查询、零布局读取。
 * ------------------------------------------------------------ */
interface ParallaxItem {
  el: HTMLElement;
  bannerTop: number; // banner 顶部的文档坐标
  bannerH: number;
  speed: number;
  fade: boolean;
}

const cache = {
  header: null as HTMLElement | null,
  topBtn: null as HTMLElement | null,
  reading: null as HTMLElement | null,
  bannerH: 0, // 导航变磨砂的滚动阈值（banner 高 - header 高）
  scrollable: 0, // 可滚动总距离
  parallax: [] as ParallaxItem[],
  scrolled: false, // 导航当前态（值不变不写 DOM）
};

function rebuildScrollCache() {
  cache.header = document.getElementById('site-header');
  cache.topBtn = document.getElementById('back-to-top');
  cache.reading = document.getElementById('reading-progress');

  cache.scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  // 导航变磨砂的阈值：通常取横幅底部；但矮页面（随笔/归档等内容少、
  // 可滚动距离不足横幅高度）按可滚距离的 70% 收缩，保证滚动时也能触发双态
  const banner = document.querySelector<HTMLElement>('.page-banner');
  cache.bannerH = banner ? Math.min(banner.offsetHeight - 84, cache.scrollable * 0.7) : 0;

  cache.parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')].map((el) => {
    const b = el.closest<HTMLElement>('.page-banner');
    return {
      el,
      bannerTop: b ? b.getBoundingClientRect().top + window.scrollY : 0,
      bannerH: b?.offsetHeight ?? 0,
      speed: parseFloat(el.dataset.speed ?? '0.3'),
      fade: el.hasAttribute('data-parallax-fade'),
    };
  });
}

const parallaxActive = () => !reducedMotion() && window.innerWidth >= 768;

function onScrollFrame() {
  scrollTicking = false;
  const y = window.scrollY;

  if (cache.topBtn) cache.topBtn.classList.toggle('show', y > 360);

  if (cache.reading && cache.scrollable > 0) {
    cache.reading.style.width = `${Math.min(100, (y / cache.scrollable) * 100)}%`;
  }

  if (cache.header) {
    const scrolled = y > cache.bannerH;
    if (scrolled !== cache.scrolled) {
      cache.scrolled = scrolled;
      cache.header.classList.toggle('scrolled', scrolled);
    }
  }

  if (parallaxActive()) {
    const vh = window.innerHeight;
    for (const p of cache.parallax) {
      const rel = y - p.bannerTop; // banner 顶滚过视口顶的距离
      if (rel > p.bannerH + 80 || rel < -(vh + 80)) continue;
      p.el.style.transform = `translate3d(0, ${(-rel * p.speed).toFixed(1)}px, 0)`;
      if (p.fade) {
        const prog = Math.min(1, Math.max(0, rel / (p.bannerH * 0.55)));
        p.el.style.opacity = String(1 - prog);
      }
    }
  }
}

let scrollTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(onScrollFrame);
  },
  { passive: true }
);

document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('#back-to-top')) {
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
});

let resizeTimer = 0;
window.addEventListener(
  'resize',
  () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuildScrollCache, 200);
  },
  { passive: true }
);

/* ------------------------------------------------------------
 * 顶/底边界果冻：滚轮/触控板在页面顶或底继续滚时，
 * 导航栏被轻微拉出并拉伸，松手后多段过冲回弹。
 * 只作用于导航栏小元素；wheel 只累积数据，rAF 统一应用。
 * ------------------------------------------------------------ */
(() => {
  if (reducedMotion()) return;

  const MAX_PULL = 60; // 拉力上限
  const SOFTNESS = 0.3; // 位移缩放：最大视觉位移 ≈ 18px，克制不喧宾
  let pull = 0;
  let dir = 0; // -1=顶部边界 1=底部边界
  let idleTimer = 0;
  let rafPending = false;
  let cooldownUntil = 0; // 回弹动画播放中：忽略新的边界滚动（不打断动画，避免抽搐）

  const getHeader = () => document.getElementById('site-header');
  const stretchOf = (p: number) => Math.min(0.12, p / 500);

  function render() {
    const h = getHeader();
    if (!h) return;
    if (pull <= 0) {
      h.style.transform = '';
      return;
    }
    const stretch = (1 + stretchOf(pull)).toFixed(3);
    if (dir < 0) {
      // 顶部边界：只向下拉出（上边缘钉在视口顶，不露底色）+ 拉伸
      const shift = pull * SOFTNESS;
      h.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scaleY(${stretch})`;
    } else {
      // 底部边界：不上移（同样避免露底色），只做下边缘拉伸
      h.style.transform = `scaleY(${stretch})`;
    }
  }

  function schedule() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      render();
    });
  }

  function release() {
    const h = getHeader();
    if (!h || pull <= 0) {
      pull = 0;
      dir = 0;
      return;
    }
    // 回弹位移钳制在 [0, from]：导航上边缘永不越过视口顶（不会露底色），
    // 果冻感全部由 scaleY（下边缘拉伸压缩）承担
    const from = dir < 0 ? pull * SOFTNESS : 0;
    const s = stretchOf(pull);
    pull = 0;
    dir = 0;
    h.style.transform = '';
    const anim = h.animate(
      [
        { transform: `translateY(${from.toFixed(1)}px) scaleY(${(1 + s).toFixed(3)})`, offset: 0 },
        { transform: `translateY(0px) scaleY(${(1 - s * 0.7).toFixed(3)})`, offset: 0.4 },
        { transform: `translateY(${(from * 0.14).toFixed(1)}px) scaleY(${(1 + s * 0.4).toFixed(3)})`, offset: 0.7 },
        { transform: `translateY(0px) scaleY(${(1 - s * 0.14).toFixed(3)})`, offset: 0.86 },
        { transform: 'translateY(0px) scaleY(1)', offset: 1 },
      ],
      { duration: 620, easing: 'ease-out' }
    );
    // 冷却到回弹动画播完（略留 40ms 余量）：期间新的边界滚动被忽略，不打断动画
    cooldownUntil = performance.now() + 660;
    const lift = () => (cooldownUntil = 0);
    anim.onfinish = lift;
    anim.oncancel = lift;
  }

  window.addEventListener(
    'wheel',
    (e) => {
      if (e.deltaY === 0 || cache.scrollable <= 8) return;
      const atTop = window.scrollY <= 0;
      const atBottom = window.scrollY >= cache.scrollable - 1;
      const want = e.deltaY < 0 ? -1 : 1;
      const edge = (atTop && want < 0) || (atBottom && want > 0);

      if (!edge || (dir !== 0 && dir !== want)) {
        if (pull > 0) {
          clearTimeout(idleTimer);
          release();
        }
        return;
      }
      // 冷却期：回弹动画播放中，忽略新的边界滚动（不打断动画，避免抽搐）
      if (performance.now() < cooldownUntil) return;
      dir = want;
      // 橡皮筋硬度：拉得越多，继续拉越费劲
      const inc = Math.min(Math.abs(e.deltaY) * 0.18, 28) * (1 - pull / MAX_PULL);
      pull = Math.min(pull + inc, MAX_PULL);
      schedule();
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(release, 130);
    },
    { passive: true }
  );

  document.addEventListener('astro:page-load', () => {
    clearTimeout(idleTimer);
    pull = 0;
    dir = 0;
    cooldownUntil = 0;
    const h = getHeader();
    if (h) h.style.transform = '';
  });
})();

/* ------------------------------------------------------------
 * 滚动入场动画（[data-reveal]）
 * ------------------------------------------------------------ */
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.revealed)');
  if (!els.length) return;
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('revealed'));
    return;
  }
  // 双向：滚入视口 → 浮现；滚出视口 → 回到隐藏态，再次滚入重新播放
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('revealed', entry.isIntersecting);
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -36px 0px' }
  );
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------
 * 代码块 → Mac 风格窗口 + 复制按钮
 * ------------------------------------------------------------ */
function initCodeWindows() {
  document.querySelectorAll('pre.astro-code').forEach((pre) => {
    if (pre.closest('.code-window')) return;
    const code = pre.querySelector('code');
    const langMatch = code?.className.match(/language-([\w-]+)/);
    const lang = langMatch ? langMatch[1] : 'text';

    const wrap = document.createElement('div');
    wrap.className = 'code-window';
    pre.parentNode!.insertBefore(wrap, pre);

    const header = document.createElement('div');
    header.className = 'code-window-header';
    header.innerHTML =
      '<span class="term-dot" style="background:#ff5f57"></span>' +
      '<span class="term-dot" style="background:#febc2e"></span>' +
      '<span class="term-dot" style="background:#28c840"></span>' +
      `<span class="code-window-lang">${lang}</span>`;

    const copy = document.createElement('button');
    copy.className = 'code-copy-btn';
    copy.type = 'button';
    copy.textContent = 'copy';
    copy.addEventListener('click', async () => {
      const text = code?.textContent ?? '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      copy.textContent = 'copied ✓';
      copy.classList.add('copied');
      setTimeout(() => {
        copy.textContent = 'copy';
        copy.classList.remove('copied');
      }, 1600);
    });
    header.appendChild(copy);
    wrap.append(header, pre);
  });
}

/* ------------------------------------------------------------
 * 文章目录高亮
 * ------------------------------------------------------------ */
function initToc() {
  const toc = document.getElementById('toc');
  if (!toc) return;
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[data-toc-link]'));
  const headings = links
    .map((l) => document.getElementById(l.dataset.tocLink!))
    .filter((h): h is HTMLElement => !!h);
  if (!headings.length || !('IntersectionObserver' in window)) return;

  const setActive = (id: string) => {
    for (const l of links) {
      l.classList.toggle('text-accent', l.dataset.tocLink === id);
      l.classList.toggle('text-fg-mute', l.dataset.tocLink !== id);
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    },
    { rootMargin: '-88px 0px -68% 0px' }
  );
  headings.forEach((h) => io.observe(h));
}

/* ------------------------------------------------------------
 * 页脚：一言 + 建站天数 + 不蒜子
 * ------------------------------------------------------------ */
async function initHitokoto() {
  const el = document.getElementById('hitokoto');
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = '1';

  const CACHE_KEY = 'hitokoto-cache';
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
      el.textContent = cached.t;
      const from = document.getElementById('hitofrom');
      if (from) from.textContent = cached.f ? `—— ${cached.f}` : '';
      return;
    }
  } catch {}

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k&encode=json', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = (await res.json()) as { hitokoto: string; from?: string; from_who?: string };
    el.textContent = data.hitokoto;
    const source = data.from_who || data.from || '';
    const from = document.getElementById('hitofrom');
    if (from) from.textContent = source ? `—— ${source}` : '';
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: data.hitokoto, f: source, ts: Date.now() }));
    } catch {}
  } catch {
    /* 网络不可用时保留 HTML 里的默认句子 */
  }
}

function initSiteDays() {
  const el = document.getElementById('site-days');
  if (!el) return;
  const start = new Date(SITE.siteStart).getTime();
  el.textContent = String(Math.max(0, Math.floor((Date.now() - start) / 86_400_000) + 1));
}

function initBusuanzi() {
  const w = window as unknown as { __busuanziLoaded?: boolean };
  if (w.__busuanziLoaded || !document.querySelector('.busuanzi_container')) return;
  w.__busuanziLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  document.body.appendChild(s);
}

/* ------------------------------------------------------------
 * 搜索（Pagefind，仅构建后有索引；Ctrl K / "/" 唤起）
 * ------------------------------------------------------------ */
let pagefindApi: any = null; // null=未加载 false=不可用
async function ensurePagefind(): Promise<any> {
  if (pagefindApi !== null) return pagefindApi;
  try {
    // 运行时计算路径绕过 Vite 静态分析（索引只在 build 后存在）
    const url = new URL('pagefind/pagefind.js', window.location.origin).href;
    pagefindApi = await import(/* @vite-ignore */ url);
    if (pagefindApi?.options) await pagefindApi.options({});
  } catch {
    pagefindApi = false;
  }
  return pagefindApi;
}

function initSearch() {
  const IDLE = '输入关键词，回车或点击结果跳转。';
  const NO_INDEX = '搜索索引在 npm run build 之后生成，dev 预览时不可用。';

  const getDialog = () => document.getElementById('search-dialog') as HTMLDialogElement | null;
  const getInput = () => document.getElementById('search-input') as HTMLInputElement | null;
  const getResults = () => document.getElementById('search-results');
  const hint = (msg: string) => `<p class="text-fg-mute px-1 py-6 text-center font-mono text-xs">${msg}</p>`;

  // 带动画的关闭：先播 .closing 出场动画，结束后真正 close
  const closeDialog = () => {
    const d = getDialog();
    if (!d || !d.open || d.classList.contains('closing')) return;
    d.classList.add('closing');
    setTimeout(() => {
      d.classList.remove('closing');
      d.close();
    }, 160);
  };

  async function runSearch(q: string) {
    const results = getResults();
    if (!results) return;
    if (!q) {
      results.innerHTML = hint(IDLE);
      return;
    }
    const pf = await ensurePagefind();
    if (!pf) {
      results.innerHTML = hint(NO_INDEX);
      return;
    }
    results.innerHTML = hint('搜索中…');
    try {
      const search = await pf.search(q);
      const taken = search.results.slice(0, 8);
      if (!taken.length) {
        results.innerHTML = hint(`没有与 “${q}” 匹配的结果。`);
        return;
      }
      const data = await Promise.all(taken.map((r: any) => r.data()));
      results.innerHTML = data
        .map(
          (d: any, i: number) => `
            <a href="${d.url}" class="search-result block px-3 py-2.5 rounded-lg hover:bg-accent-soft transition-colors" style="--i:${i}">
              <p class="font-kai font-semibold leading-snug">${d.meta?.title ?? d.url}</p>
              <p class="text-fg-mute text-xs mt-1 leading-relaxed">${d.excerpt ?? ''}</p>
            </a>`
        )
        .join('');
      results.querySelectorAll('a[href]').forEach((a) => a.addEventListener('click', closeDialog));
    } catch {
      results.innerHTML = hint('搜索出错了，请稍后再试。');
    }
  }

  const open = async () => {
    const dialog = getDialog();
    const input = getInput();
    const results = getResults();
    if (!dialog || !input || !results) return;
    dialog.showModal();
    input.focus();
    if (input.value.trim()) return runSearch(input.value.trim());
    const pf = await ensurePagefind();
    results.innerHTML = hint(pf ? IDLE : NO_INDEX);
  };

  // 快捷键与按钮：一次性委托，元素实时查询（换页后引用会失效）
  if (!document.documentElement.dataset.searchBound) {
    document.documentElement.dataset.searchBound = '1';
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.search-open')) {
        e.preventDefault();
        open();
      }
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        getDialog()?.open ? closeDialog() : open();
      } else if (e.key === '/' && !typing && !getDialog()?.open) {
        e.preventDefault();
        open();
      }
    });
  }

  const dialog = getDialog();
  const input = getInput();
  if (dialog && dialog.dataset.backdropBound !== '1') {
    dialog.dataset.backdropBound = '1';
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog();
    });
    // Esc 触发的关闭也走动画：拦截原生 cancel，改为带动画关闭
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeDialog();
    });
  }
  if (input && input.dataset.bound !== '1') {
    input.dataset.bound = '1';
    let timer = 0;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      timer = window.setTimeout(() => runSearch(q), 180);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = getResults()?.querySelector<HTMLAnchorElement>('a[href]');
        if (first) {
          closeDialog();
          first.click();
        }
      }
    });
  }
}

/* ------------------------------------------------------------
 * 移动端汉堡菜单（一次性事件委托）
 * ------------------------------------------------------------ */
(function bindMobileNav() {
  if (document.documentElement.dataset.navBound) return;
  document.documentElement.dataset.navBound = '1';

  const closeMenu = () => {
    document.querySelector('.mobile-menu')?.classList.remove('open');
    document.querySelector('.nav-burger')?.classList.remove('open');
    document.querySelector('.nav-burger')?.setAttribute('aria-expanded', 'false');
  };

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const burger = target.closest('.nav-burger');
    if (burger) {
      const menu = document.querySelector('.mobile-menu');
      if (!menu) return;
      const open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      return;
    }
    if (target.closest('.mobile-menu')) {
      if (target.closest('a')) closeMenu();
      return;
    }
    closeMenu();
  });
})();

/* ------------------------------------------------------------
 * 每次页面加载（首次 + ClientRouter 导航后）统一初始化
 * ------------------------------------------------------------ */
function onPageLoad() {
  applyTheme(document.documentElement); // 与 before-swap 预写互为双保险

  // 导航后若搜索弹窗还开着，关掉
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  if (dialog?.open) dialog.close();

  rebuildScrollCache();
  onScrollFrame(); // 立即应用初始状态（视差/双态/回顶）

  initReveal();
  initCodeWindows();
  initToc();
  initHitokoto();
  initSiteDays();
  initBusuanzi();
  initSearch();
}

document.addEventListener('astro:page-load', onPageLoad);
