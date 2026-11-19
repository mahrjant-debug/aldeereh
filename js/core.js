/* أصداء الديرة — النواة. تعرّف window.AL وتستخدمها بقية الملفات. */
(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const DEF = { dark: null, fs: 1, af: 'naskh', notif: true, sound: true, vibrate: true, breakingOnly: false, obitNotif: true,
  quiet: false, qFrom: 23, qTo: 6, qBreak: true, digest: false, digestHour: 21, notifCats: CATS.filter(c => c.n !== 'مقالات').map(c => c.n),
  ttsRate: 1, dataSaver: false, autoRefresh: true, adhan: false, pMethod: 4, offline: true, batterySaver: false };

/* ---------- State ---------- */
const S = {
  posts: store.get('ald_posts', null) || FALLBACK,
  opinions: store.get('ald_ops', null) || OPINIONS,
  videos: store.get('ald_vids', null) || VRAW.map(r => mkV(r[0], r[1], r[2], r[3], r[4])),
  obits: null, weddings: null, catIds: null, extra: [], local: store.get('ald_local', []),
  live: false, loading: false, online: navigator.onLine !== false, cacheT: store.get('ald_cache_t', 0),
  saved: store.get('ald_saved', []),
  follows: store.get('ald_follows', { authors: [] }),
  reactions: store.get('ald_react', {}),
  settings: Object.assign({}, DEF, store.get('ald_settings', {})),
  cache: {}, saver: false
};
const AL = window.AL = { S, $, $$, esc, store, DEF, routes: [], hooks: {}, timers: {}, app };

/* ---------- Helpers ---------- */
const AR = AL.AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
AL.ago = d => {
  const t = typeof d === 'number' ? d : Date.parse(d); if (!t) return '';
  const m = Math.max(0, (Date.now() - t) / 6e4);
  if (m < 1) return 'الآن';
  if (m < 60) return 'منذ ' + AR(Math.floor(m)) + ' د';
  if (m < 1440) return 'منذ ' + AR(Math.floor(m / 60)) + ' س';
  if (m < 43200) return 'منذ ' + AR(Math.floor(m / 1440)) + ' يوم';
  return new Date(t).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
};
const ago = AL.ago;
AL.fullDate = d => { try { return new Date(d).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; } };
AL.hijri = d => { try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d || new Date()); } catch (e) { return ''; } };
AL.toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(AL.toast.t); AL.toast.t = setTimeout(() => t.classList.remove('on'), 2800); };
const toast = AL.toast;
AL.api = async (path, ms = 12000) => {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(SITE + '/wp-json/wp/v2/' + path, { signal: c.signal }); if (!r.ok) { const e = new Error(r.status); e.status = r.status; throw e; } return await r.json(); }
  finally { clearTimeout(t); }
};
const api = AL.api;
AL.setMeta = (title, desc, img) => {
  document.title = title ? title + ' — أصداء الديرة' : 'أصداء الديرة — أخبار المنيزلة والأحساء';
  const set = (sel, v) => { const e = $(sel); if (e && v) e.setAttribute('content', v); };
  set('meta[name=description]', desc); set('meta[property="og:title"]', title || 'أصداء الديرة');
  set('meta[property="og:description"]', desc); set('meta[property="og:image"]', img);
};
const setMeta = AL.setMeta;
const img = AL.img = (p, big) => (big ? (p.img || p.thumb) : (p.thumb || p.img)) || '';
const link = AL.link = p => (p.obit ? '/obit/' : p.opinion ? '/opinion/' : '/news/') + p.id;
const isSaved = id => S.saved.some(x => x.id === id);
AL.save = () => store.set('ald_settings', S.settings);
AL.live = path => (decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/') === path;
AL.page = (title, body, cls) => `<div class="pg ${cls || ''}"><h1 class="pt">${esc(title)}</h1>${body}</div>`;
AL.back = `<button class="icon back" data-back aria-label="رجوع"><span class="material-symbols-rounded">arrow_forward</span></button>`;
AL.allKnown = () => [...S.posts, ...S.opinions, ...S.extra];
AL.remember = list => { S.extra = [...S.extra, ...list].slice(-150); };
const NOIMG = () => S.settings.dataSaver;

/* ---------- Components ---------- */
const pic = AL.pic = (p, cls, big) => {
  const u = img(p, big);
  if (!(u && !NOIMG())) return `<div class="${cls || ''} ph"></div>`;
  const fail = `onerror="this.${cls === 'row-img' || cls === 'card-img' ? 'parentNode.' : ''}replaceWith(Object.assign(document.createElement('div'),{className:'${cls || ''} ph'}))"`;
  if (cls === 'row-img' || cls === 'card-img') return `<span class="${cls} pw" style="--u:url('${esc(u).replace(/'/g, '%27')}')"><img src="${esc(u)}" alt="" loading="lazy" ${fail}></span>`;
  return `<img class="${cls || ''}" src="${esc(u)}" alt="" loading="lazy" ${fail}>`;
};
const badges = AL.badges = p => (p.breaking ? '<span class="pill red">عاجل</span>' : '') + (/^\s*بالفيديو|^\s*فيديو/.test(p.title || '') ? '<span class="pill vtag">▶ فيديو</span>' : '') + `<span class="pill">${esc(p.cat || '')}</span>`;
const card = AL.card = (p, extra) => p.opinion ? opCard(p) : `<a class="card" href="${link(p)}" data-link>${pic(p, 'card-img')}<div class="card-b"><div class="meta">${badges(p)}</div><h3>${esc(p.title)}</h3><div class="meta dim">${esc(ago(p.date))}${p.author ? ' · ' + esc(p.author) : ''}</div>${extra || ''}</div></a>`;
const row = AL.row = (p, extra) => `<div class="row-w"><a class="row" href="${link(p)}" data-link>${pic(p, 'row-img')}<div><div class="meta">${badges(p)}</div><h3>${esc(p.title)}</h3>${p.subtitle ? `<p class="dim sub">${esc(p.subtitle)}</p>` : ''}<div class="meta dim">${esc(ago(p.date))}${extra || ''}</div></div></a><button class="bm ${isSaved(p.id) ? 'on' : ''}" data-save="${p.id}" aria-label="حفظ"><span class="material-symbols-rounded">bookmark</span></button></div>`;
const heroCard = (p, big) => `<a class="hero-c ${big ? 'big' : ''}" href="${link(p)}" data-link>${pic(p, 'hero-img', true)}<div class="hero-t"><div class="meta">${badges(p)}</div>${p.subtitle ? `<div class="hero-sub">${esc(p.subtitle)}</div>` : ''}<h2>${esc(p.title)}</h2><div class="meta">${esc(ago(p.date))}${p.author ? ' · ' + esc(p.author) : ''}</div></div></a>`;
const avatar = (p, cls) => (p.thumb && !NOIMG()) ? `<img class="${cls}" src="${esc(p.thumb)}" alt="${esc(p.author || '')}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} ini',textContent:'${esc((p.author || '؟')[0])}'}))">` : `<span class="${cls} ini">${esc((p.author || '؟')[0])}</span>`;
const opCard = AL.opCard = p => `<a class="op" href="/opinion/${p.id}" data-link>${avatar(p, 'op-av')}<h3>${esc(p.title)}</h3><div class="op-f"><b>${esc(p.author || '')}</b><span class="dim sm">${esc(ago(p.date))}</span></div></a>`;
const vidCard = AL.vidCard = v => `<button class="vid" data-yt="${esc(v.yt)}" data-vert="${v.vertical ? 1 : 0}" data-title="${esc(v.title)}"><div class="vid-th">${NOIMG() ? '' : `<img src="${esc(v.thumb)}" alt="" loading="lazy">`}<span class="play material-symbols-rounded">play_arrow</span>${v.vertical ? '<span class="pill">قصير</span>' : ''}</div><h3>${esc(v.title)}</h3><div class="dim sm">${esc(ago(v.date))}</div></button>`;
const section = AL.section = (title, more, body, cls, sponsor) => `<section class="sec ${cls || ''}"><div class="sec-h"><h2>${esc(title)}</h2>${more ? `<a href="${more}" data-link>عرض الكل</a>` : ''}</div>${body}${sponsor === false ? '' : `<div class="spons">${(SPONSORS && SPONSORS[title]) ? 'هذا القسم برعاية ' + esc(SPONSORS[title]) : 'رعاية هذا القسم متاحة للمعلنين'}</div>`}</section>`;
const statusHTML = () => `<div class="status ${S.live ? 'live' : ''}"><i></i><span>${S.live ? 'مباشر من الموقع' : (S.loading ? 'جارٍ التحديث…' : 'نسخة محفوظة')}</span></div>`;
function updateStatus() { $$('.status').forEach(s => { s.className = 'status ' + (S.live ? 'live' : ''); s.lastElementChild.textContent = S.live ? 'مباشر من الموقع' : (S.loading ? 'جارٍ التحديث…' : 'نسخة محفوظة'); }); }

/* ---------- Saver / motion ---------- */
function motionOK() {
  return !document.hidden && !S.saver && !matchMedia('(prefers-reduced-motion: reduce)').matches && !$('#modal.on') && !AL.busy;
}
AL.motionOK = motionOK;
async function detectSaver() {
  let low = false;
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); low = b.level <= 0.2 && !b.charging; b.addEventListener('levelchange', detectSaver); b.addEventListener('chargingchange', detectSaver); } } catch (e) {}
  const cn = navigator.connection; if (cn && cn.saveData) low = true;
  S.saver = !!(S.settings.batterySaver || low);
  S.saverAuto = low;
  document.documentElement.classList.toggle('saver', S.saver);
}

/* ---------- Data loading ---------- */
async function loadPosts(silent) {
  if (!S.online) { if (!silent) toast('أنت غير متصل — عرض النسخة المحفوظة'); return false; }
  S.loading = true; updateStatus();
  try {
    const list = (await api('posts?per_page=30&_embed=author,wp:featuredmedia,wp:term')).map(fromWP).filter(Boolean);
    if (!list.length) throw 0;
    const known = new Set(S.posts.map(p => p.id)); const wasLive = S.live;
    const fresh = wasLive ? list.filter(p => !known.has(p.id)) : [];
    S.posts = list; S.live = true; S.cacheT = Date.now(); S.sig = list[0].id + '|' + (list[0].modified || '');
    if (S.settings.offline) { store.set('ald_posts', list.slice(0, 20)); store.set('ald_cache_t', S.cacheT); }
    if (!silent) toast('تم تحديث الأخبار');
    if (fresh.length && AL.hooks.onNew) fresh.slice().reverse().forEach(p => AL.hooks.onNew(p));
  } catch (e) { if (!silent) toast('تعذّر الاتصال — عرض النسخة المحفوظة'); }
  S.loading = false; updateStatus(); AL.offbar(); return S.live;
}
AL.loadPosts = loadPosts;
async function loadOpinions() {
  try {
    const list = (await api('articles?per_page=12&_embed=author,wp:featuredmedia')).map(x => {
      const p = fromWP(x); if (!p) return null; const au = AUTHORS[x.author];
      const emb = (((x._embedded || {}).author || [])[0] || {}).name;
      return Object.assign(p, { author: (au && au.n) || emb || 'كاتب في أصداء الديرة', img: p.img || (au && au.img) || '', thumb: (au && au.img) || p.thumb || '', cat: 'مقالات', opinion: true, catKeys: [nk('مقالات')] });
    }).filter(Boolean);
    if (list.length) {
      const old = new Set(S.opinions.map(o => o.id));
      if (S.opsLoaded && AL.hooks.onNewOpinion) list.filter(o => !old.has(o.id)).forEach(o => AL.hooks.onNewOpinion(o));
      S.opsLoaded = true; S.opinions = list; store.set('ald_ops', list);
    }
  } catch (e) {}
}
async function loadVideos() {
  try {
    const list = (await api('videos?per_page=20&_fields=id,title,date,link,content')).map(x => {
      const h = (x.content || {}).rendered || '';
      const m = h.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/) || h.match(/youtu\.be\/([\w-]{6,})/) || h.match(/[?&]v=([\w-]{6,})/);
      if (!m) return null;
      const w = +(h.match(/width="(\d+)"/) || [])[1] || 16, hh = +(h.match(/height="(\d+)"/) || [])[1] || 9;
      const t = document.createElement('textarea'); t.innerHTML = (x.title || {}).rendered || '';
      return mkV(x.id, t.value.trim(), m[1], x.date, hh > w, x.link);
    }).filter(Boolean);
    if (list.length) { S.videos = list; store.set('ald_vids', list); }
  } catch (e) {}
}
async function loadObits() {
  try { S.obits = (await api('posts?categories=4&per_page=30&_fields=id,title,date,content,link,comment_status')).map(parseObit).filter(Boolean); S.obitErr = false; }
  catch (e) { S.obits = S.obits || []; S.obitErr = true; }
  if (AL.hooks.onObits) AL.hooks.onObits();
}
async function catIds() { if (!S.catIds) { try { S.catIds = await api('categories?per_page=100&_fields=id,name,count,parent'); } catch (e) { S.catIds = []; } } return S.catIds; }
/* أرقام الأقسام لاسم قسم: القسم نفسه + كل فروعه (الموقع لا يعيد أخبار الفروع تلقائياً) + الأقسام المحلية الإضافية */
AL.idsFor = async name => {
  const all = await catIds(), k = nk(name);
  const base = all.filter(c => { const n = nk(c.name.replace(/&amp;/g, '&')); return n === k || n.includes(k) || k.includes(n); }).map(c => c.id);
  const roots = [...base]; if (k === nk(LOCAL_CAT)) roots.push(...LOCAL_EXTRA);
  const set = new Set(roots); let grew = true;
  while (grew) { grew = false; all.forEach(c => { if (c.parent && set.has(c.parent) && !set.has(c.id)) { set.add(c.id); grew = true; } }); }
  return [...set];
};
AL.loadByCat = async (name, n = 24) => {
  const ids = await AL.idsFor(name); if (!ids.length) return null;
  return (await api('posts?categories=' + ids.join(',') + '&per_page=' + n + '&_embed=author,wp:featuredmedia,wp:term')).map(fromWP).filter(Boolean);
};
async function loadLocal() { try { const l = await AL.loadByCat(LOCAL_CAT, 8); if (l && l.length) { S.local = l; store.set('ald_local', l.slice(0, 8)); } } catch (e) {} }
async function checkNew() {
  if (!S.online) return;
  try { const j = await api('posts?per_page=1&_fields=id,modified', 8000); const sig = j[0] && (j[0].id + '|' + (j[0].modified || '')); if (sig && sig !== S.sig) { await loadPosts(true); if (AL.live('/')) renderHome(); } } catch (e) {}
}
async function fullRefresh() { await Promise.all([loadPosts(true), loadOpinions(), loadVideos(), loadObits(), loadLocal()]); if (AL.hooks.onFull) AL.hooks.onFull(); if (AL.live('/')) renderHome(); }
AL.fullRefresh = fullRefresh;

/* ---------- Stored items cleanup (deleted on the site) ---------- */
async function verifyStored() {
  if (!S.online) return;
  const gone = new Set();
  for (const [type, ids] of [['posts', S.saved.filter(x => !x.opinion).map(x => x.id)], ['articles', S.saved.filter(x => x.opinion).map(x => x.id)]]) {
    if (!ids.length) continue;
    try { const ok = new Set((await api(type + '?include=' + ids.join(',') + '&per_page=100&_fields=id', 9000)).map(x => x.id)); ids.forEach(i => { if (!ok.has(i)) gone.add(i); }); } catch (e) { return; }
  }
  if (gone.size) { S.saved = S.saved.filter(x => !gone.has(x.id)); store.set('ald_saved', S.saved); AL.hooks.purge && AL.hooks.purge(gone); updateBadges(); }
}

/* ---------- Pages ---------- */
function mostRead(range) {
  const now = Date.now(), win = range === 'week' ? 7 * 864e5 : 2 * 864e5;
  let pool = S.posts.filter(p => p.views > 0 && now - Date.parse(p.date) < win);
  if (pool.length < 3) pool = S.posts.filter(p => p.views > 0);
  return pool.slice().sort((a, b) => b.views - a.views).slice(0, 5);
}
AL.mostRead = mostRead;
AL.digestTop = () => { const m = mostRead('day'); return m.length >= 3 ? m : S.posts.slice(0, 5); };
const mostHTML = range => mostRead(range).map((p, i) => `<a class="mr" href="${link(p)}" data-link><b>${AR(i + 1)}</b><div><div>${esc(p.title)}</div><div class="dim sm">${AR(p.views)} مشاهدة</div></div></a>`).join('') || '<p class="dim sm">لا توجد بيانات مشاهدات بعد</p>';

function vbandHTML() {
  const V = S.videos.slice(0, 10); if (!V.length) return '';
  return `<div class="vband"><div class="vb-bg" id="vbbg" style="${NOIMG() ? '' : `background-image:url('${esc(V[0].thumb)}')`}"></div>
  <div class="vb-win"><div class="vb-track" id="vbt">${V.map(v => `<div class="vb-s"><button class="vb-card" data-yt="${esc(v.yt)}" data-vert="${v.vertical ? 1 : 0}" data-title="${esc(v.title)}">${NOIMG() ? '' : `<img src="${esc(v.thumb)}" alt="" loading="lazy">`}<span class="play material-symbols-rounded">play_arrow</span>${v.vertical ? '<span class="pill">قصير</span>' : ''}</button><h3>${esc(v.title)}</h3></div>`).join('')}</div></div>
  <div class="vb-n"><span id="vbc">${AR(1)} / ${AR(V.length)}</span><span class="dots" id="vbd">${V.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</span></div></div>`;
}
function renderHome() {
  const el = app; if (!AL.live('/')) return;
  const y = scrollY; el.innerHTML = pageHome(); startHome(el); scrollTo(0, y);
  if (AL.hooks.afterHome) AL.hooks.afterHome(el);
}
AL.renderHome = renderHome;
function pageHome() {
  const P = S.posts, hero = P.slice(0, 5), rest = P.slice(5);
  const brk = P.filter(p => p.breaking);
  const mourn = (S.obits || []).find(o => o.active);
  setMeta('', 'أخبار المنيزلة والأحساء أولاً بأول', hero[0] && img(hero[0], true));
  const tk = (brk.length ? brk : P.slice(0, 6));
  return `${AL.hooks.homeTop ? AL.hooks.homeTop() : ''}
  <a class="ticker" id="ticker" href="${link(tk[0])}" data-link><span class="pill ${brk.length ? 'red' : ''}" id="tklab">${brk.length ? 'عاجل' : 'الآن'}</span><span id="tktx">${esc(tk[0].title)}</span></a>
  <div id="pstrip"></div>
  ${mourn ? `<a class="mourn" href="/obits" data-link><span class="material-symbols-rounded">local_florist</span><div><b>مجلس عزاء قائم</b><div class="naskh">${esc((mourn.pre ? mourn.pre + ' ' : '') + mourn.name)}</div></div></a>` : ''}
  <div class="hero" id="hero">${hero.map((p, i) => heroCard(p, i === 0)).join('')}</div>
  <div class="dots hero-d" id="herod">${hero.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
  ${statusHTML()}
  <div id="senior"></div>
  <div class="cols"><div class="main"><div class="list">${rest.slice(0, 5).map(p => row(p)).join('')}</div>
    ${section('الأكثر قراءة', '', `<div class="seg" id="mrseg"><button class="on" data-mr="day">اليوم</button><button data-mr="week">الأسبوع</button></div><div id="mrl">${mostHTML('day')}</div>`)}</div>
  <aside class="side">${section('مقالات الرأي', '/c/' + encodeURIComponent('مقالات'), `<div class="ops">${S.opinions.slice(0, 4).map(opCard).join('')}</div>`)}<div id="pollbox"></div></aside></div>
  ${S.local && S.local.length ? section('أخبار المنيزلة', '/c/' + encodeURIComponent(LOCAL_CAT), `<div class="list">${S.local.slice(0, 5).map(p => row(p)).join('')}</div>`) : ''}
  ${section('مكتبة الفيديو', '/videos', vbandHTML(), 'dark')}
  ${section('المزيد من الأخبار', '', `<div class="list wide">${rest.slice(5, 9).map(p => row(p)).join('')}</div><div class="grid">${rest.slice(9).map(card).join('')}</div>`)}
  <div id="installbox"></div>`;
}
function stopTimers() { Object.values(AL.timers).forEach(t => clearInterval(t)); AL.timers = {}; }
AL.stopTimers = stopTimers;
function startHome(el) {
  stopTimers();
  const h = $('#hero', el), dots = $$('#herod i', el); let hi = 0;
  if (h) {
    const upd = () => { const c = h.getBoundingClientRect(), mid = c.left + c.width / 2; let b = 0, bd = 1e9; [...h.children].forEach((k, i) => { const r = k.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; b = i; } }); hi = b; dots.forEach((d, i) => d.classList.toggle('on', i === b)); };
    h.addEventListener('scroll', () => { clearTimeout(h._t); h._t = setTimeout(upd, 60); }, { passive: true });
    /* نحرّك الشريط الأفقي فقط، دون scrollIntoView الذي يسحب الصفحة كلها للأعلى */
    const goTo = i => { const k = h.children[i]; if (!k) return; const hr = h.getBoundingClientRect(), kr = k.getBoundingClientRect(); h.scrollTo({ left: h.scrollLeft + (kr.left - hr.left) - (hr.width - kr.width) / 2, behavior: 'smooth' }); };
    dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
    AL.timers.hero = setInterval(() => { if (!motionOK() || document.hidden || h.scrollWidth <= h.clientWidth + 4) return; const r = h.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; goTo((hi + 1) % h.children.length); }, 4000);
  }
  const tk = $('#ticker', el); if (tk) {
    const brk = S.posts.filter(p => p.breaking), L = brk.length ? brk : S.posts.slice(0, 6); let ti = 0;
    AL.timers.tk = setInterval(() => { if (!motionOK() || L.length < 2) return; ti = (ti + 1) % L.length; tk.href = link(L[ti]); $('#tktx').textContent = L[ti].title; }, 4500);
  }
  const vt = $('#vbt', el); if (vt) {
    const V = S.videos.slice(0, 10); let vi = 0;
    const go = i => { vi = i; vt.style.transform = `translateX(${i * 100}%)`; $('#vbc').textContent = AR(i + 1) + ' / ' + AR(V.length); $$('#vbd i').forEach((d, k) => d.classList.toggle('on', k === i)); const bg = $('#vbg') || $('#vbbg'); if (bg && !NOIMG()) bg.style.backgroundImage = `url('${V[i].thumb}')`; };
    $$('#vbd i').forEach((d, i) => d.addEventListener('click', () => go(i)));
    AL.timers.vb = setInterval(() => { if (!motionOK() || V.length < 2) return; go((vi + 1) % V.length); }, 5000);
  }
}
function pageHomeEvents(t) {
  if (t.dataset.mr) { $$('#mrseg button').forEach(b => b.classList.toggle('on', b === t)); $('#mrl').innerHTML = mostHTML(t.dataset.mr); }
}

/* ----- Explore ----- */
function pageExplore(el) {
  setMeta('استكشف', 'خدمات وأقسام أصداء الديرة');
  const svc = AL.services || [];
  const cats = [{ n: 'ركن الوفيات والعزاء', i: 'local_florist', h: '/obits' }, { n: 'ركن الأفراح والتهاني', i: 'celebration', h: '/weddings' },
    ...CATS.filter(c => !/وفايات|أفراح/.test(c.n)).map(c => ({ n: c.n, i: c.i, h: '/c/' + encodeURIComponent(c.n) })), { n: 'مكتبة الفيديو', i: 'smart_display', h: '/videos' }];
  el.innerHTML = `<h1 class="pt">استكشف</h1>
  <form class="sform" role="search"><input name="q" type="search" placeholder="ابحث في الأخبار والمقالات…" aria-label="بحث"><button class="btn" type="submit">بحث</button></form>
  <h2 class="sh">الخدمات</h2><div class="cats svc">${svc.map(c => `<a class="cat" href="${c.h}" data-link><span class="material-symbols-rounded">${c.i}</span>${esc(c.n)}</a>`).join('')}</div>
  <h2 class="sh">الأقسام</h2><div class="cats">${cats.map(c => `<a class="cat" href="${c.h}" data-link><span class="material-symbols-rounded">${c.i}</span>${esc(c.n)}</a>`).join('')}</div>
  <a class="cta" href="/send" data-link><span class="material-symbols-rounded">add_a_photo</span><div><b>لأنك مصدرنا الأول</b><div class="sm">أرسل خبرك أو صورك إلى الصحيفة</div></div></a>`;
}
async function pageCat(name, el) {
  setMeta(name, 'أخبار قسم ' + name);
  const draw = list => {
    const jobs = nk(name) === nk('وظائف وتسجيلات');
    el.innerHTML = `<h1 class="pt">${esc(name)}</h1><div class="meta" style="margin-bottom:12px"><button class="btn ghost" data-followcat="${esc(name)}">${S.settings.notifCats.includes(name) ? 'إلغاء متابعة القسم' : 'متابعة القسم'}</button></div>${list.length ? `<div class="grid${name === 'مقالات' ? ' opgrid' : ''}">${list.map(p => card(p, jobs && AL.jobChip ? AL.jobChip(p) : '')).join('')}</div>` : '<p class="empty">لا توجد أخبار في هذا القسم حالياً</p>'}${spons()}`;
  };
  const spons = () => '<div class="spons">رعاية هذا القسم متاحة للمعلنين</div>';
  if (name === 'مقالات') { draw(S.opinions); return; }
  const k = nk(name); const ids0 = S.catIds ? new Set(await AL.idsFor(name)) : null;
  draw(S.posts.filter(p => (p.catKeys || []).some(x => x.includes(k) || k.includes(x)) || (ids0 && (p.cids || []).some(i => ids0.has(i)))));
  try { const more = await AL.loadByCat(name); if (more && more.length && AL.live('/c/' + name)) { AL.remember(more); draw(more); } } catch (e) {}
}
function pageVideos(el) {
  setMeta('مكتبة الفيديو', 'فيديوهات أصداء الديرة');
  el.innerHTML = `<h1 class="pt">مكتبة الفيديو</h1><div class="vids all">${S.videos.map(vidCard).join('')}</div>`;
}
function openVideo(yt, vert, title) {
  const m = $('#modal'); const i = S.videos.findIndex(v => v.yt === yt);
  const next = S.videos.filter((v, k) => k !== i).slice(0, 4);
  m.innerHTML = `<div class="m-box ${vert === '1' ? 'vert' : ''}"><button class="m-x" aria-label="إغلاق"><span class="material-symbols-rounded">close</span></button><div class="m-v"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yt)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(title)}"></iframe></div><h3>${esc(title)}</h3><a class="btn yt" href="https://www.youtube.com/watch?v=${esc(yt)}" target="_blank" rel="noopener"><span class="material-symbols-rounded">smart_display</span>تشغيل على يوتيوب</a>
  ${next.length ? `<div class="dim sm">التالي</div><div class="nx">${next.map(v => `<button data-yt="${esc(v.yt)}" data-vert="${v.vertical ? 1 : 0}" data-title="${esc(v.title)}">${esc(v.title)}</button>`).join('')}</div>` : ''}</div>`;
  m.classList.add('on');
}
function closeModal(force) { const m = $('#modal'); if (!force && $('.inter') && $('#skipb') && $('#skipb').disabled) return; m.classList.remove('on'); m.innerHTML = ''; }
AL.closeModal = closeModal; AL.openModal = html => { const m = $('#modal'); m.innerHTML = html; m.classList.add('on'); };

/* ----- Obits ----- */
async function pageObits(el) {
  setMeta('ركن الوفيات والعزاء', 'إعلانات الوفيات ومجالس العزاء');
  const draw = () => {
    const L = S.obits || [], act = L.filter(o => o.active), old = L.filter(o => !o.active);
    const nm = o => (o.pre ? o.pre + ' ' : '') + o.name;
    el.innerHTML = `<div class="plaque">﴿إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ﴾</div><h1 class="pt">ركن الوفيات والعزاء</h1><div class="dim sm" style="margin:-8px 0 12px">${esc(AL.hijri())}</div>
    ${S.obits === null ? '<p class="empty">جارٍ التحميل…</p>' : (!L.length ? `<p class="empty">${S.obitErr ? 'تعذّر تحميل الوفيات الآن' : 'لا توجد إعلانات حالياً'}</p>` : '')}
    ${act.map(o => `<article class="obit"><div class="dim sm">انتقل إلى رحمة الله تعالى</div><h2 class="naskh">${esc(nm(o))}</h2><div class="dim sm">${esc(AL.hijri(new Date(o.date)))} · العزاء قائم · اليوم ${AR(o.dayN)} من ٣</div>
      <dl>${o.time || o.place ? `<dt>التشييع والدفن</dt><dd>${esc([o.time, o.place].filter(Boolean).join(' · '))}</dd>` : ''}${o.men ? `<dt>عزاء الرجال</dt><dd>${esc(o.men)}</dd>` : ''}${o.women ? `<dt>عزاء النساء</dt><dd>${esc(o.women)}</dd>` : ''}${o.days ? `<dt>مدة العزاء</dt><dd>${esc(o.days)}</dd>` : ''}</dl>
      <div class="acts"><button class="btn" data-condole="${o.id}">أرسل تعزية</button><button class="btn ghost" data-shareobit="${o.id}">مشاركة النعي</button><a class="btn ghost" href="/obit/${o.id}" data-link>نص الخبر</a></div></article>`).join('')}
    ${old.length ? `<h2 class="sh">نعي سابق</h2><div class="list">${old.map(o => `<a class="row" href="/obit/${o.id}" data-link><div><h3 class="naskh">${esc(nm(o))}</h3><div class="dim sm">${esc(ago(o.date))}</div></div></a>`).join('')}</div>` : ''}
    <a class="cta" href="https://wa.me/966594002003" target="_blank" rel="noopener"><span class="material-symbols-rounded">chat</span><div><b>للإبلاغ عن وفاة</b><div class="sm">تواصل معنا عبر واتساب</div></div></a>`;
  };
  draw(); if (S.obits === null || S.obitErr) { S.obitErr = false; await loadObits(); if (AL.live('/obits')) draw(); }
}
const obitPost = o => norm({ id: o.id, title: o.title, paras: o.paras, full: true, date: o.date, link: o.link, cat: 'الأحداث والوفايات', author: 'أصداء الديرة', img: '', thumb: '', commentsClosed: o.closed, obit: true });
function condole(o) {
  sessionStorage.setItem('ald_prefill', o.female ? 'أحسن الله لكم العزاء، وتغمّد الفقيدة بواسع رحمته، وألهمكم الصبر والسلوان. إنا لله وإنا إليه راجعون.' : 'أحسن الله لكم العزاء، وتغمّد الفقيد بواسع رحمته، وألهمكم الصبر والسلوان. إنا لله وإنا إليه راجعون.');
  go('/obit/' + o.id);
}
function shareObit(o) {
  const lines = ['إنا لله وإنا إليه راجعون', (o.pre ? o.pre + ' ' : '') + o.name + ' في ذمة الله', o.time || o.place ? ('التشييع: ' + [o.time, o.place].filter(Boolean).join(' – ')) : '', o.men ? ('عزاء الرجال: ' + o.men) : '', o.women ? ('عزاء النساء: ' + o.women) : '', o.link];
  share({ title: 'نعي: ' + o.name, link: o.link, text: lines.filter(Boolean).join('\n') });
}

/* ----- Weddings ----- */
const wType = p => /عقد قران|عقد القران|ملكة/.test(p.title) ? 'عقد قران' : 'زفاف';
const wNames = p => (p.title.match(/«([^»]+)»/) || [])[1] || '';
async function pageWeddings(el) {
  setMeta('ركن الأفراح والتهاني', 'أفراح ومسرات المنيزلة');
  const wc = w => `<div class="card wed">${pic(w, 'card-img')}<div class="card-b"><div class="meta"><span class="pill">${wType(w)}</span></div><h3 class="naskh">${esc(wNames(w) || w.title)}</h3><div class="dim sm">${esc(w.title)}</div>
    <div class="acts"><button class="btn" data-congrats="${w.id}">بارك لهم</button><button class="btn ghost" data-card="${w.id}">بطاقة تهنئة</button><button class="btn ghost" data-sharepost="${w.id}">مشاركة</button></div></div></div>`;
  const draw = () => { el.innerHTML = `<div class="plaque green">بارك الله لهما وبارك عليهما</div><h1 class="pt">ركن الأفراح والتهاني</h1>${S.weddings === null ? '<p class="empty">جارٍ التحميل…</p>' : S.weddings.length ? `<div class="grid">${S.weddings.map(wc).join('')}</div>` : '<p class="empty">لا توجد أخبار حالياً</p>'}`; };
  draw();
  if (S.weddings === null) { try { S.weddings = (await AL.loadByCat('أفراح')) || []; AL.remember(S.weddings); } catch (e) { S.weddings = S.posts.filter(p => /افراح|مسرات/.test(nk(p.cat))); } if (AL.live('/weddings')) draw(); }
}
function congrats(w) {
  sessionStorage.setItem('ald_prefill', wType(w) === 'عقد قران' ? 'ألف مبروك، بارك الله لهما وبارك عليهما وجمع بينهما في خير. مبارك لأهلهما هذه الفرحة.' : 'مبارك عليكم الزفاف، بارك الله لهما وبارك عليهما وجمع بينهما في خير. أدام الله أفراحكم.');
  go('/news/' + w.id);
}

/* ----- Saved / search ----- */
function pageSaved(el) {
  setMeta('المحفوظة', 'الأخبار التي حفظتها');
  el.innerHTML = `<h1 class="pt">المحفوظة</h1>${S.saved.length ? `<div class="list">${S.saved.map(p => row(p)).join('')}</div><button class="btn ghost" data-clearsaved style="margin-top:16px">مسح المحفوظات</button>` : '<p class="empty"><span class="material-symbols-rounded big">bookmark</span><br>لا توجد أخبار محفوظة</p>'}`;
}
async function pageSearch(q, el) {
  setMeta('بحث', 'نتائج البحث'); const k = q.trim();
  const form = `<form class="sform" role="search"><input name="q" type="search" value="${esc(k)}" placeholder="ابحث في الأخبار والمقالات…" aria-label="بحث"><button class="btn" type="submit">بحث</button></form>`;
  const local = AL.allKnown().filter((p, i, a) => a.findIndex(x => x.id === p.id) === i && ((p.title || '') + ' ' + (p.excerpt || '')).includes(k));
  const draw = list => { el.innerHTML = `<h1 class="pt">بحث</h1>${form}${k ? `<h2 class="sh">نتائج «${esc(k)}»</h2>${list.length ? `<div class="list">${list.map(p => row(p)).join('')}</div>` : '<p class="empty">لا توجد نتائج</p>'}` : ''}`; };
  if (!k) { draw([]); return; }
  draw(local);
  try { const r = (await api('posts?search=' + encodeURIComponent(k) + '&per_page=20&_embed=author,wp:featuredmedia,wp:term')).map(fromWP).filter(Boolean); AL.remember(r); if (new URLSearchParams(location.search).get('q') === k) draw(r.length ? r : local); } catch (e) {}
}

/* ---------- Article ---------- */
const REACTS = [['like', 'thumb_up', 'أعجبني'], ['imp', 'priority_high', 'مهم'], ['use', 'lightbulb', 'مفيد'], ['sad', 'sentiment_sad', 'مؤسف']];
function neighbors(p) {
  const L = p.opinion ? S.opinions : S.posts; const i = L.findIndex(x => x.id === p.id);
  return i < 0 ? {} : { prev: L[i - 1], next: L[i + 1] };
}
function navCard(p, label) { return p ? `<a class="navc" href="${link(p)}" data-link><span class="dim sm">${label}</span><b>${esc(p.title)}</b></a>` : '<span></span>'; }
function articleHTML(p, full) {
  const paras = (p.paras && p.paras.length ? p.paras : (p.excerpt ? [p.excerpt] : []));
  const nb = neighbors(p), my = (S.reactions || {})[p.id];
  const isOp = p.opinion, fa = isOp && S.follows.authors.includes(p.author);
  return `<article class="art" data-id="${p.id}">
  <div class="art-top"><button class="icon" data-back aria-label="رجوع"><span class="material-symbols-rounded">arrow_forward</span></button>
  <div class="art-acts"><button class="icon" data-fs="-1" aria-label="تصغير الخط">A-</button><button class="icon" data-fs="1" aria-label="تكبير الخط">A+</button>
  <button class="icon ${isSaved(p.id) ? 'on' : ''}" data-save="${p.id}" aria-label="حفظ"><span class="material-symbols-rounded">bookmark</span></button>
  <button class="icon" data-sharepost="${p.id}" aria-label="مشاركة"><span class="material-symbols-rounded">share</span></button></div></div>
  ${isOp ? `<div class="op-hero">${avatar(p, 'op-av big')}<b>${esc(p.author || '')}</b></div>` : ''}
  <div id="vslot"></div>
  ${!isOp && img(p, true) && !NOIMG() ? `<img class="art-img" src="${esc(img(p, true))}" alt="" onerror="this.remove()">` : ''}
  <div class="meta">${badges(p)}</div>
  ${p.subtitle ? `<div class="art-sub">${esc(p.subtitle)}</div>` : ''}
  <h1>${esc(p.title)}</h1>
  <div class="meta dim">${p.author ? esc(p.author) + ' · ' : ''}${esc(AL.fullDate(p.date))}${p.views ? ' · ' + AR(p.views) + ' مشاهدة' : ''}</div>
  <button class="btn big card-btn" data-card="${p.id}"><span class="material-symbols-rounded">ios_share</span>شارك كبطاقة صورة</button>
  <div class="art-tools"><button class="btn ghost" data-tts><span class="material-symbols-rounded">play_arrow</span><span>استمع إلى الخبر</span></button>
  <a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + (p.link || location.href))}" target="_blank" rel="noopener">واتساب</a></div>
  <div class="body">${paras.length ? paras.map(t => `<p>${esc(t)}</p>`).join('') : '<p class="empty">جارٍ تحميل النص…</p>'}${full ? '' : '<div class="skel"></div>'}</div>
  ${p.gallery && p.gallery.length && !NOIMG() ? `<h2 class="sh">صور الخبر</h2><div class="gal">${p.gallery.map((g, i) => `<button data-gal="${i}"><img src="${esc(g.th)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
  <div class="react">${REACTS.map(([k, ic, l]) => `<button class="${my === k ? 'on' : ''}" data-react="${k}"><span class="material-symbols-rounded">${ic}</span>${l}</button>`).join('')}</div>
  <div class="art-tools">${isOp ? `<button class="btn ghost" data-followauthor="${esc(p.author)}">${fa ? 'إلغاء متابعة الكاتب' : 'متابعة الكاتب'}</button>` : `<button class="btn ghost" data-followcat="${esc(p.cat)}">${S.settings.notifCats.includes(p.cat) ? 'إلغاء متابعة القسم' : 'متابعة القسم'}</button>`}
  <a class="btn ghost" href="${esc(p.link)}" target="_blank" rel="noopener">عرض الخبر على موقع الصحيفة</a></div>
  ${(nb.prev || nb.next) ? `<div class="navs">${navCard(nb.prev, 'الخبر السابق')}${navCard(nb.next, 'الخبر التالي')}</div>` : ''}
  <section class="comments" id="comments"><h2 class="sh">التعليقات</h2><div id="clist" class="dim">جارٍ التحميل…</div>${p.commentsClosed ? '<p class="dim">التعليقات مغلقة على هذا الخبر</p>' : `<form id="cform"><input name="n" placeholder="الاسم (اختياري)" maxlength="60"><input name="e" type="email" placeholder="البريد (اختياري)"><textarea name="t" required maxlength="500" placeholder="اكتب تعليقك…" rows="3">${esc(sessionStorage.getItem('ald_prefill') || '')}</textarea><div class="dim sm" id="ccount"></div><div class="dim sm" id="cerr" style="color:#C0392B"></div><button class="btn" type="submit">إرسال التعليق</button></form>`}</section>
  <div id="related"></div></article>`;
}
AL.loadVideo = async p => {
  if (!S.online) return;
  const K = 'ald_yt', M = store.get(K, {}); let yt = M[p.id];
  if (yt === undefined) {
    try { const r = await fetch('/api/yt?id=' + p.id); if (!r.ok) return; yt = (await r.json()).yt || ''; M[p.id] = yt; const ks = Object.keys(M); if (ks.length > 150) delete M[ks[0]]; store.set(K, M); } catch (e) { return; }
  }
  const slot = $('#vslot'); if (!yt || !slot || !AL.live(link(p))) return;
  const poster = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, fb = esc(img(p, true) || '');
  slot.innerHTML = `<div class="vplayer" data-yt="${yt}" role="button" tabindex="0" aria-label="تشغيل الفيديو"><img src="${poster}" alt="" ${fb ? `onerror="this.onerror=null;this.src='${fb}'"` : ''}><span class="vp-tag"><span class="material-symbols-rounded">videocam</span>فيديو</span><span class="vp-play"><span class="material-symbols-rounded">play_arrow</span></span></div>`;
  const ai = $('.art-img'); if (ai) ai.remove();
};
document.addEventListener('click', e => {
  const v = e.target.closest('.vplayer[data-yt]'); if (!v) return;
  v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="فيديو الخبر"></iframe>`; v.removeAttribute('data-yt'); v.removeAttribute('role');
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.vplayer[data-yt]')) { e.preventDefault(); e.target.click(); } });
async function pageArticle(kind, id, el) {
  let p = kind === 'obit' ? (S.obits || []).map(obitPost).find(x => x.id === id) : AL.allKnown().find(x => x.id === id);
  const opinion = kind === 'opinion', key = kind[0] + id;
  if (S.cache[key]) p = S.cache[key];
  const draw = (x, full) => { el.innerHTML = articleHTML(x, full); setMeta(x.title, x.excerpt || x.subtitle || '', img(x, true)); AL.cur = x; $('#cform textarea') && updCount(); };
  if (p) draw(p, !!p.full || kind === 'obit'); else el.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  if (kind === 'obit') { if (!p) { await loadObits(); p = (S.obits || []).map(obitPost).find(x => x.id === id); if (p) draw(p, true); else el.innerHTML = '<p class="empty">النعي غير موجود</p>'; } }
  else {
    try {
      const x = await api((opinion ? 'articles/' : 'posts/') + id + '?_embed=author,wp:featuredmedia,wp:term');
      const f = fromWP(x); if (!f) throw 0;
      if (opinion) { const au = AUTHORS[x.author]; f.opinion = true; f.cat = 'مقالات'; f.catKeys = [nk('مقالات')]; f.author = (au && au.n) || ((((x._embedded || {}).author || [])[0] || {}).name) || (p && p.author) || 'كاتب في أصداء الديرة'; f.thumb = f.thumb || (au && au.img) || ''; }
      S.cache[key] = f; p = f; if (AL.live(link(f))) draw(f, true);
    } catch (e) {
      if (e.status === 404 && p) { toast('تم حذف هذا الخبر من الصحيفة'); go('/'); return; }
      if (!p) { el.innerHTML = `<p class="empty">تعذّر تحميل الخبر. <a href="${SITE}/${id}.html" target="_blank" rel="noopener">افتحه على موقع الصحيفة</a></p>`; return; }
      const sk = $('.skel', el); if (sk) sk.outerHTML = `<p class="dim sm">تعذّر تحميل النص الكامل — <a href="${esc(p.link)}" target="_blank" rel="noopener">اقرأه على الموقع</a></p>`;
    }
  }
  if (!AL.live(link(p))) return;
  AL.logRead && AL.logRead(p);
  if (kind === 'news') AL.loadVideo(p);
  loadComments(p);
  const rel = S.posts.filter(x => x.id !== p.id && (x.catKeys || []).some(k => (p.catKeys || []).includes(k))).slice(0, 3);
  const r = $('#related', el); if (r && rel.length) r.innerHTML = section('من نفس القسم', '', `<div class="grid">${rel.map(x => card(x)).join('')}</div>`, '', false);
  if (!S.saver && S.online) {
    AL.timers.cm = setInterval(() => { if (!document.hidden && AL.live(link(p))) loadComments(p, true); }, 120000);
    if (kind !== 'obit') AL.timers.ex = setInterval(async () => { if (document.hidden || !AL.live(link(p))) return; try { await api((opinion ? 'articles/' : 'posts/') + id + '?_fields=id,status', 8000); } catch (e) { if (e.status === 404) { toast('تم حذف هذا الخبر من الصحيفة'); go('/'); } } }, 30000);
  }
}
function updCount() { const t = $('#cform textarea'), c = $('#ccount'); if (t && c) c.textContent = AR(t.value.length) + ' / ٥٠٠'; }
async function loadComments(p, quiet) {
  const box = $('#clist'); if (!box) return;
  const pend = store.get('ald_pending', []).filter(x => Date.now() - x.t < 864e5);
  try {
    const list = p.obit ? [] : await api('comments?post=' + p.id + '&per_page=50&order=asc&_fields=id,author_name,date,content,parent');
    const t = document.createElement('div'); const texts = new Set();
    const html = list.map(c => { t.innerHTML = c.content.rendered; const tx = t.textContent.trim(); texts.add(tx); return `<div class="cm ${c.parent ? 'rep' : ''}"><span class="ini">${esc((c.author_name || 'ز')[0])}</span><div><b>${esc(c.author_name || 'زائر')}</b> <span class="dim sm">${esc(ago(c.date))}</span><p>${esc(tx)}</p></div></div>`; }).join('');
    const mine = pend.filter(x => x.post === p.id && !texts.has(x.text));
    store.set('ald_pending', pend.filter(x => !texts.has(x.text)));
    const ph = mine.map(x => `<div class="cm"><span class="ini">${esc((x.name || 'ز')[0])}</span><div><b>${esc(x.name)}</b> <span class="pill pend">بانتظار المراجعة</span><p>${esc(x.text)}</p></div></div>`).join('');
    box.className = ''; box.innerHTML = (html + ph) || '<p class="dim">كن أول من يعلّق</p>';
  } catch (e) { if (!quiet) box.textContent = 'تعذّر تحميل التعليقات'; }
}
async function sendComment(form) {
  const id = AL.cur ? AL.cur.id : 0; const d = new FormData(form); const text = (d.get('t') || '').trim(); const email = (d.get('e') || '').trim(); const err = $('#cerr');
  if (!text) return; if (email && !/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'البريد الإلكتروني غير صحيح'; return; }
  err.textContent = ''; const btn = $('button[type=submit]', form); btn.disabled = true;
  try {
    const r = await fetch(SITE + '/wp-json/wp/v2/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post: id, author_name: (d.get('n') || '').trim() || 'زائر', author_email: email, content: text }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch (e) {} throw new Error(m || r.status); }
    const name = (d.get('n') || '').trim() || 'زائر'; const pend = store.get('ald_pending', []); pend.push({ post: id, name, text, t: Date.now() }); store.set('ald_pending', pend);
    sessionStorage.removeItem('ald_prefill'); form.reset(); updCount(); toast('تم الإرسال — بانتظار مراجعة الإدارة'); loadComments(AL.cur, true);
  } catch (e) { err.textContent = 'رفض الموقع التعليق: ' + (e.message && !/^\d+$/.test(e.message) ? e.message.replace(/<[^>]+>/g, '') : 'تعذّر الإرسال، حاول لاحقاً'); }
  btn.disabled = false;
}
function lightbox(p, i) {
  const G = p.gallery || []; if (!G.length) return; i = (i + G.length) % G.length;
  AL.openModal(`<div class="lb"><button class="m-x" aria-label="إغلاق"><span class="material-symbols-rounded">close</span></button><img src="${esc(G[i].src)}" alt=""><div class="lb-n"><button data-lb="${i - 1}" aria-label="السابق"><span class="material-symbols-rounded">chevron_right</span></button><span>${AR(i + 1)} / ${AR(G.length)}</span><button data-lb="${i + 1}" aria-label="التالي"><span class="material-symbols-rounded">chevron_left</span></button></div></div>`);
}

/* ---------- Router ---------- */
let speaking = false;
function stopTTS() { try { speechSynthesis.cancel(); } catch (e) {} speaking = false; }
AL.route = async function route() {
  stopTTS(); stopTimers(); closeModal(true);
  const path = decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/';
  const el = app; let m;
  document.body.dataset.page = path.split('/')[1] || 'home';
  const top = path === '/' ? 'home' : path.split('/')[1];
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === top));
  el.className = '';
  if (path === '/') renderHome();
  else if (path === '/explore' || path === '/categories') pageExplore(el);
  else if ((m = path.match(/^\/c\/(.+)$/))) pageCat(m[1], el);
  else if (path === '/videos') pageVideos(el);
  else if (path === '/obits') pageObits(el);
  else if (path === '/weddings') pageWeddings(el);
  else if (path === '/saved') pageSaved(el);
  else if (path === '/search') pageSearch(new URLSearchParams(location.search).get('q') || '', el);
  else if ((m = path.match(/^\/(news|opinion|obit)\/(\d+)$/))) pageArticle(m[1], +m[2], el);
  else {
    const r = AL.routes.find(r => r[0] === path || (r[0] instanceof RegExp && r[0].test(path)));
    if (r) r[1](el, path); else el.innerHTML = '<p class="empty">الصفحة غير موجودة</p><a class="btn" href="/" data-link>العودة للرئيسية</a>';
  }
  if (path !== '/') scrollTo(0, 0);
  updateBadges();
};
const go = AL.go = url => { history.pushState(null, '', url); AL.route(); };
function updateBadges() {
  const sb = $('#savedCount'); if (sb) { sb.textContent = S.saved.length ? AR(S.saved.length) : ''; sb.hidden = !S.saved.length; }
  const n = (S.notifs || []).filter(x => !x.read).length;
  $$('.nbadge').forEach(b => { b.textContent = n ? AR(n > 9 ? '9+' : n) : ''; b.hidden = !n; });
}
AL.updateBadges = updateBadges;
AL.offbar = () => {
  let b = $('#offbar'); if (!b) { b = document.createElement('div'); b.id = 'offbar'; document.body.prepend(b); }
  b.hidden = S.online; b.textContent = 'أنت غير متصل' + (S.cacheT ? ' · آخر حفظ ' + ago(S.cacheT) : '');
};

/* ---------- Settings application ---------- */
AL.apply = () => {
  const st = S.settings, dark = st.dark == null ? matchMedia('(prefers-color-scheme: dark)').matches : st.dark;
  const r = document.documentElement; r.dataset.theme = dark ? 'dark' : 'light';
  r.style.setProperty('--fs', st.fs); r.dataset.af = st.af;
  r.classList.toggle('nodata', !!st.dataSaver);
  $$('#theme .material-symbols-rounded').forEach(i => i.textContent = dark ? 'light_mode' : 'dark_mode');
};
AL.setS = patch => { Object.assign(S.settings, patch); AL.save(); AL.apply(); detectSaver(); };
function toggleSave(id) {
  const p = AL.allKnown().find(x => x.id === id) || S.cache['n' + id] || S.cache['o' + id] || S.saved.find(x => x.id === id); if (!p) return;
  if (isSaved(id)) S.saved = S.saved.filter(x => x.id !== id);
  else S.saved.unshift({ id: p.id, title: p.title, thumb: p.thumb, img: p.img, cat: p.cat, date: p.date, subtitle: p.subtitle || '', opinion: !!p.opinion, catKeys: p.catKeys });
  store.set('ald_saved', S.saved); toast(isSaved(id) ? 'تم الحفظ' : 'أُزيل من المحفوظات');
  $$('[data-save="' + id + '"]').forEach(b => b.classList.toggle('on', isSaved(id))); updateBadges();
  if (AL.live('/saved')) pageSaved(app);
}
async function share(o) {
  const url = o.link || location.href; const text = o.text || o.title;
  try { if (navigator.share) { await navigator.share({ title: o.title, text, url: o.text ? undefined : url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(o.text || (o.title + '\n' + url)); toast('تم نسخ النص'); } catch (e) { toast(url); }
}
AL.share = share;
function tts(btn) {
  if (!('speechSynthesis' in window)) { toast('القراءة الصوتية غير مدعومة في هذا المتصفح'); return; }
  const reset = () => { speaking = false; btn.lastElementChild.textContent = 'استمع إلى الخبر'; btn.firstElementChild.textContent = 'play_arrow'; };
  if (speaking) { stopTTS(); reset(); return; }
  AL.speak($('.art h1').textContent + '. ' + $$('.art .body p').map(p => p.textContent).join(' '), reset);
  speaking = true; btn.lastElementChild.textContent = 'إيقاف'; btn.firstElementChild.textContent = 'stop';
}
AL.speak = (text, done) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.rate = S.settings.ttsRate || 1; u.onend = u.onerror = () => done && done(); speechSynthesis.speak(u); } catch (e) { done && done(); } };
AL.stopTTS = stopTTS;
AL.react = (id, k) => { const R = S.reactions; R[id] = R[id] === k ? null : k; store.set('ald_react', R); $$('.react button').forEach(b => b.classList.toggle('on', b.dataset.react === R[id])); };
AL.toggleFollowAuthor = name => { const has = S.follows.authors.includes(name); S.follows.authors = has ? S.follows.authors.filter(x => x !== name) : [...S.follows.authors, name]; store.set('ald_follows', S.follows); toast(has ? 'ألغيت متابعة ' + name : 'ستصلك إشعارات مقالات ' + name); $$('[data-followauthor]').forEach(b => b.textContent = has ? 'متابعة الكاتب' : 'إلغاء متابعة الكاتب'); if (AL.live('/follows')) AL.route(); };
AL.toggleFollowCat = c => { const has = S.settings.notifCats.includes(c); AL.setS({ notifCats: has ? S.settings.notifCats.filter(x => x !== c) : [...S.settings.notifCats, c] }); toast(has ? 'ألغيت متابعة قسم ' + c : 'ستصلك إشعارات قسم ' + c); $$('[data-followcat]').forEach(b => { if (b.dataset.followcat === c) b.textContent = has ? 'متابعة القسم' : 'إلغاء متابعة القسم'; }); if (AL.live('/follows')) AL.route(); };

/* ---------- Events ---------- */
let touch = null;
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.target !== '_blank') { e.preventDefault(); go(a.getAttribute('href')); return; }
  const t = e.target.closest('[data-yt],[data-save],[data-sharepost],[data-fs],[data-back],[data-tts],[data-mr],[data-condole],[data-shareobit],[data-congrats],[data-card],[data-react],[data-followauthor],[data-followcat],[data-gal],[data-lb],[data-clearsaved],#theme,#refresh,.m-x,#modal');
  if (!t) return;
  const D = t.dataset;
  if (D.yt) openVideo(D.yt, D.vert, D.title);
  else if (D.save) toggleSave(+D.save);
  else if (D.sharepost) { const p = AL.allKnown().find(x => x.id === +D.sharepost) || AL.cur; if (p) share({ title: p.title, link: p.link }); }
  else if (D.fs) { AL.setS({ fs: Math.min(1.45, Math.max(.85, +(S.settings.fs + (+D.fs) * .1).toFixed(2))) }); }
  else if (D.back !== undefined) { history.length > 1 ? history.back() : go('/'); }
  else if (D.tts !== undefined) tts(t);
  else if (D.mr) pageHomeEvents(t);
  else if (D.condole) { const o = (S.obits || []).find(x => x.id === +D.condole); if (o) condole(o); }
  else if (D.shareobit) { const o = (S.obits || []).find(x => x.id === +D.shareobit); if (o) shareObit(o); }
  else if (D.congrats) { const w = (S.weddings || []).find(x => x.id === +D.congrats); if (w) congrats(w); }
  else if (D.card) { const p = AL.allKnown().find(x => x.id === +D.card) || (AL.cur && AL.cur.id === +D.card ? AL.cur : null) || (S.cache['n' + D.card]); if (p && AL.shareCard) AL.shareCard(p, t); }
  else if (D.react) AL.react(AL.cur.id, D.react);
  else if (D.followauthor) AL.toggleFollowAuthor(D.followauthor);
  else if (D.followcat) AL.toggleFollowCat(D.followcat);
  else if (D.gal !== undefined) lightbox(AL.cur, +D.gal);
  else if (D.lb !== undefined) lightbox(AL.cur, +D.lb);
  else if (D.clearsaved !== undefined) { if (confirm('مسح كل الأخبار المحفوظة؟')) { S.saved = []; store.set('ald_saved', []); pageSaved(app); updateBadges(); } }
  else if (t.id === 'theme') { AL.setS({ dark: document.documentElement.dataset.theme !== 'dark' }); }
  else if (t.id === 'refresh') { t.classList.add('spin'); fullRefresh().then(() => { t.classList.remove('spin'); toast(S.live ? 'تم تحديث الأخبار' : 'تعذّر الاتصال — عرض النسخة المحفوظة'); }); }
  else if (t.classList.contains('m-x') || (t.id === 'modal' && e.target === t)) closeModal();
});
document.addEventListener('submit', e => {
  if (e.target.id === 'cform') { e.preventDefault(); sendComment(e.target); }
  if (e.target.classList.contains('sform')) { e.preventDefault(); const q = new FormData(e.target).get('q').trim(); if (q) go('/search?q=' + encodeURIComponent(q)); }
});
document.addEventListener('input', e => { if (e.target.closest('#cform') && e.target.name === 't') updCount(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('touchstart', e => { const a = e.target.closest('.art'); touch = a && !e.target.closest('input,textarea,.gal') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
document.addEventListener('touchend', e => {
  if (!touch || !AL.cur) return; const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y; touch = null;
  if (Math.abs(dx) < 90 || Math.abs(dy) > 60) return; const nb = neighbors(AL.cur); const t = dx < 0 ? nb.next : nb.prev; if (t) go(link(t));
}, { passive: true });
window.addEventListener('popstate', () => AL.route());
window.addEventListener('online', () => { S.online = true; AL.offbar(); loadPosts(true); });
window.addEventListener('offline', () => { S.online = false; S.live = false; AL.offbar(); updateStatus(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) return; if (Date.now() - (S.lastFull || 0) > 120000) { S.lastFull = Date.now(); checkNew(); } });

/* ---------- Start ---------- */
AL.start = async function () {
  AL.apply(); await detectSaver(); AL.offbar();
  try { const o = store.get('ald_opens', { n: 0 }); o.n++; store.set('ald_opens', o); } catch (e) {}
  AL.route(); S.lastFull = Date.now();
  await fullRefresh(); verifyStored();
  const every = () => S.saver ? [10 * 60e3, 60 * 60e3] : [3 * 60e3, 15 * 60e3];
  let lastFull = Date.now();
  setInterval(() => { if (document.hidden || !S.settings.autoRefresh || !S.online) return; const [c, f] = every(); S.tick = (S.tick || 0) + 30e3;
    if (Date.now() - lastFull > f) { lastFull = Date.now(); fullRefresh(); verifyStored(); S.tick = 0; } else if (S.tick >= c) { S.tick = 0; checkNew(); } }, 30e3);
};
})();
