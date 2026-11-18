/* أصداء الديرة — موقع ويب متجاوب. يعتمد على data.js و parsers.js */
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

/* ---------- State ---------- */
const S = {
  posts: store.get('ald_posts', null) || FALLBACK,
  opinions: store.get('ald_ops', null) || OPINIONS,
  videos: store.get('ald_vids', null) || VRAW.map(r => mkV(r[0], r[1], r[2], r[3], r[4])),
  obits: null,
  weddings: null,
  catIds: null,
  live: false,
  loading: false,
  saved: store.get('ald_saved', []),
  settings: Object.assign({ dark: null, fs: 1 }, store.get('ald_settings', {})),
  cache: {}
};

/* ---------- Helpers ---------- */
const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function ago(d) {
  const t = Date.parse(d); if (!t) return '';
  const m = Math.max(0, (Date.now() - t) / 6e4);
  if (m < 1) return 'الآن';
  if (m < 60) return 'منذ ' + AR(Math.floor(m)) + ' د';
  if (m < 1440) return 'منذ ' + AR(Math.floor(m / 60)) + ' س';
  if (m < 43200) return 'منذ ' + AR(Math.floor(m / 1440)) + ' يوم';
  return new Date(t).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fullDate(d) {
  try { return new Date(d).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; }
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
}
async function api(path, ms = 12000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(SITE + '/wp-json/wp/v2/' + path, { signal: c.signal });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
function setMeta(title, desc, img) {
  document.title = title ? title + ' — أصداء الديرة' : 'أصداء الديرة — أخبار المنيزلة والأحساء';
  const set = (sel, v) => { const e = $(sel); if (e && v) e.setAttribute('content', v); };
  set('meta[name=description]', desc); set('meta[property="og:title"]', title || 'أصداء الديرة');
  set('meta[property="og:description"]', desc); set('meta[property="og:image"]', img);
}
const img = (p, big) => (big ? (p.img || p.thumb) : (p.thumb || p.img)) || '';
const link = p => (p.opinion ? '/opinion/' : '/news/') + p.id;
const isSaved = id => S.saved.some(x => x.id === id);

/* ---------- Components ---------- */
function pic(p, cls, big) {
  const u = img(p, big);
  return u ? `<img class="${cls || ''}" src="${esc(u)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls || ''} ph'}))">` : `<div class="${cls || ''} ph"></div>`;
}
function badges(p) {
  return (p.breaking ? '<span class="pill red">عاجل</span>' : '') + `<span class="pill">${esc(p.cat || '')}</span>`;
}
function card(p) {
  return `<a class="card" href="${link(p)}" data-link>${pic(p, 'card-img')}<div class="card-b"><div class="meta">${badges(p)}</div><h3>${esc(p.title)}</h3><div class="meta dim">${esc(ago(p.date))}${p.author ? ' · ' + esc(p.author) : ''}</div></div></a>`;
}
function row(p) {
  return `<a class="row" href="${link(p)}" data-link>${pic(p, 'row-img')}<div><div class="meta">${badges(p)}</div><h3>${esc(p.title)}</h3>${p.subtitle ? `<p class="dim sub">${esc(p.subtitle)}</p>` : ''}<div class="meta dim">${esc(ago(p.date))}</div></div></a>`;
}
function heroCard(p, big) {
  return `<a class="hero-c ${big ? 'big' : ''}" href="${link(p)}" data-link>${pic(p, 'hero-img', true)}<div class="hero-t"><div class="meta">${badges(p)}</div>${p.subtitle && big ? `<div class="hero-sub">${esc(p.subtitle)}</div>` : ''}<h2>${esc(p.title)}</h2><div class="meta">${esc(ago(p.date))}${p.author ? ' · ' + esc(p.author) : ''}</div></div></a>`;
}
function opCard(p) {
  return `<a class="op" href="/opinion/${p.id}" data-link><span class="material-symbols-rounded q">format_quote</span><h3>${esc(p.title)}</h3><div class="au">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : `<span class="ini">${esc((p.author || '؟')[0])}</span>`}<div><b>${esc(p.author || '')}</b><div class="dim sm">${esc(ago(p.date))}</div></div></div></a>`;
}
function vidCard(v) {
  return `<button class="vid" data-yt="${esc(v.yt)}" data-vert="${v.vertical ? 1 : 0}" data-title="${esc(v.title)}"><div class="vid-th"><img src="${esc(v.thumb)}" alt="" loading="lazy"><span class="play material-symbols-rounded">play_arrow</span>${v.vertical ? '<span class="pill">قصير</span>' : ''}</div><h3>${esc(v.title)}</h3><div class="dim sm">${esc(ago(v.date))}</div></button>`;
}
const section = (title, more, body, cls) => `<section class="sec ${cls || ''}"><div class="sec-h"><h2>${esc(title)}</h2>${more ? `<a href="${more}" data-link>عرض الكل</a>` : ''}</div>${body}</section>`;
const status = () => `<div class="status ${S.live ? 'live' : ''}"><i></i>${S.live ? 'مباشر من الموقع' : (S.loading ? 'جارٍ التحديث…' : 'نسخة محفوظة')}</div>`;

/* ---------- Data loading ---------- */
async function loadPosts(silent) {
  S.loading = true; updateStatus();
  try {
    const list = (await api('posts?per_page=30&_embed=author,wp:featuredmedia,wp:term')).map(fromWP).filter(Boolean);
    if (!list.length) throw 0;
    const known = new Set(S.posts.map(p => p.id));
    const fresh = S.live ? list.filter(p => !known.has(p.id)).length : 0;
    S.posts = list; S.live = true; store.set('ald_posts', list.slice(0, 20));
    if (!silent) toast('تم تحديث الأخبار'); else if (fresh) toast(AR(fresh) + ' خبر جديد');
  } catch (e) { if (!silent) toast('تعذّر الاتصال — عرض النسخة المحفوظة'); }
  S.loading = false; updateStatus(); return S.live;
}
async function loadOpinions() {
  try {
    const list = (await api('articles?per_page=12&_embed=author,wp:featuredmedia')).map(x => {
      const p = fromWP(x); if (!p) return null; const au = AUTHORS[x.author];
      const emb = (((x._embedded || {}).author || [])[0] || {}).name;
      return Object.assign(p, { author: (au && au.n) || emb || 'كاتب في أصداء الديرة', img: p.img || (au && au.img) || '', thumb: (au && au.img) || p.thumb || '', cat: 'مقالات', opinion: true });
    }).filter(Boolean);
    if (list.length) { S.opinions = list; store.set('ald_ops', list); }
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
  try {
    S.obits = (await api('posts?categories=4&per_page=30&_fields=id,title,date,content,link,comment_status')).map(parseObit).filter(Boolean);
  } catch (e) { S.obits = S.obits || []; S.obitErr = true; }
}
async function catIds() {
  if (!S.catIds) { try { S.catIds = await api('categories?per_page=100&_fields=id,name,count'); } catch (e) { S.catIds = []; } }
  return S.catIds;
}
async function loadByCat(name) {
  const k = nk(name), ids = (await catIds()).filter(c => { const n = nk(c.name.replace(/&amp;/g, '&')); return n.includes(k) || k.includes(n); }).map(c => c.id);
  if (!ids.length) return null;
  return (await api('posts?categories=' + ids.join(',') + '&per_page=24&_embed=author,wp:featuredmedia,wp:term')).map(fromWP).filter(Boolean);
}
function allKnown() { return [...S.posts, ...S.opinions, ...(S.extra || [])]; }
function remember(list) { S.extra = [...(S.extra || []), ...list].slice(-120); }

/* ---------- Pages ---------- */
function pageHome() {
  const P = S.posts, hero = P.slice(0, 5), rest = P.slice(5);
  const brk = P.filter(p => p.breaking).slice(0, 1)[0];
  const mourn = (S.obits || []).find(o => o.active);
  setMeta('', 'أخبار المنيزلة والأحساء أولاً بأول', hero[0] && img(hero[0], true));
  return `${brk ? `<a class="ticker" href="${link(brk)}" data-link><span class="pill red">عاجل</span><span>${esc(brk.title)}</span></a>` : ''}
  ${mourn ? `<a class="mourn" href="/obits" data-link><span class="material-symbols-rounded">local_florist</span><div><b>مجلس عزاء قائم</b><div class="naskh">${esc((mourn.pre ? mourn.pre + ' ' : '') + mourn.name)}</div></div></a>` : ''}
  <div class="hero">${hero.map((p, i) => heroCard(p, i === 0)).join('')}</div>
  ${status()}
  <div class="cols"><div class="main"><div class="list">${rest.slice(0, 8).map(row).join('')}</div></div>
  <aside class="side">${section('مقالات الرأي', '/c/' + encodeURIComponent('مقالات'), `<div class="ops">${S.opinions.slice(0, 4).map(opCard).join('')}</div>`)}</aside></div>
  ${section('مكتبة الفيديو', '/videos', `<div class="vids">${S.videos.slice(0, 4).map(vidCard).join('')}</div>`, 'dark')}
  ${section('المزيد من الأخبار', '', `<div class="grid">${rest.slice(8).map(card).join('')}</div>`)}`;
}
function pageCats() {
  setMeta('الأقسام', 'تصفح أقسام الصحيفة');
  const extra = [{ n: 'ركن الوفيات والعزاء', i: 'local_florist', h: '/obits' }, { n: 'ركن الأفراح والتهاني', i: 'celebration', h: '/weddings' }, { n: 'مكتبة الفيديو', i: 'smart_display', h: '/videos' }];
  const cats = CATS.filter(c => !/وفايات|أفراح/.test(c.n)).map(c => ({ n: c.n, i: c.i, h: '/c/' + encodeURIComponent(c.n) }));
  return `<h1 class="pt">الأقسام</h1><div class="cats">${[...extra, ...cats].map(c => `<a class="cat" href="${c.h}" data-link><span class="material-symbols-rounded">${c.i}</span>${esc(c.n)}</a>`).join('')}</div>
  <a class="cta" href="https://wa.me/966594002003" target="_blank" rel="noopener"><span class="material-symbols-rounded">add_a_photo</span><div><b>لأنك مصدرنا الأول</b><div class="sm">أرسل خبرك أو صورك عبر واتساب</div></div></a>`;
}
async function pageCat(name, el) {
  setMeta(name, 'أخبار قسم ' + name);
  const draw = list => { el.innerHTML = `<h1 class="pt">${esc(name)}</h1>${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<p class="empty">لا توجد أخبار في هذا القسم حالياً</p>'}`; };
  if (name === 'مقالات') { draw(S.opinions); return; }
  const k = nk(name); let list = S.posts.filter(p => (p.catKeys || []).some(x => x.includes(k) || k.includes(x)));
  draw(list);
  try { const more = await loadByCat(name); if (more && more.length && location.pathname.includes(encodeURIComponent(name))) { remember(more); draw(more); } } catch (e) {}
}
function pageVideos() {
  setMeta('مكتبة الفيديو', 'فيديوهات أصداء الديرة');
  return `<h1 class="pt">مكتبة الفيديو</h1><div class="vids all">${S.videos.map(vidCard).join('')}</div>`;
}
function openVideo(yt, vert, title) {
  const m = $('#modal');
  m.innerHTML = `<div class="m-box ${vert === '1' ? 'vert' : ''}"><button class="m-x" aria-label="إغلاق"><span class="material-symbols-rounded">close</span></button><div class="m-v"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yt)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(title)}"></iframe></div><h3>${esc(title)}</h3><a class="btn" href="https://www.youtube.com/watch?v=${esc(yt)}" target="_blank" rel="noopener">تشغيل على يوتيوب</a></div>`;
  m.classList.add('on');
}
function closeModal() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; }
async function pageObits(el) {
  setMeta('ركن الوفيات والعزاء', 'إعلانات الوفيات ومجالس العزاء');
  const draw = () => {
    const L = S.obits || [], act = L.filter(o => o.active), old = L.filter(o => !o.active);
    el.innerHTML = `<div class="plaque">﴿إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ﴾</div><h1 class="pt">ركن الوفيات والعزاء</h1>
    ${S.obits === null ? '<p class="empty">جارٍ التحميل…</p>' : (!L.length ? `<p class="empty">${S.obitErr ? 'تعذّر تحميل الوفيات الآن' : 'لا توجد إعلانات حالياً'}</p>` : '')}
    ${act.map(o => `<article class="obit"><div class="dim sm">انتقل إلى رحمة الله تعالى</div><h2 class="naskh">${esc((o.pre ? o.pre + ' ' : '') + o.name)}</h2><div class="dim sm">العزاء قائم · اليوم ${AR(o.dayN)} من ٣</div>
      <dl>${o.time || o.place ? `<dt>التشييع والدفن</dt><dd>${esc([o.time, o.place].filter(Boolean).join(' · '))}</dd>` : ''}${o.men ? `<dt>عزاء الرجال</dt><dd>${esc(o.men)}</dd>` : ''}${o.women ? `<dt>عزاء النساء</dt><dd>${esc(o.women)}</dd>` : ''}</dl>
      <div class="acts"><a class="btn" href="${o.link}" target="_blank" rel="noopener">عرض الخبر</a><button class="btn ghost" data-share="${esc((o.pre ? o.pre + ' ' : '') + o.name + ' — ' + o.link)}">مشاركة</button></div></article>`).join('')}
    ${old.length ? `<h2 class="sh">سابقاً</h2><div class="list">${old.map(o => `<a class="row" href="${o.link}" target="_blank" rel="noopener"><div><h3 class="naskh">${esc((o.pre ? o.pre + ' ' : '') + o.name)}</h3><div class="dim sm">${esc(ago(o.date))}</div></div></a>`).join('')}</div>` : ''}
    <a class="cta" href="https://wa.me/966594002003" target="_blank" rel="noopener"><span class="material-symbols-rounded">chat</span><div><b>للإبلاغ عن وفاة</b><div class="sm">تواصل معنا عبر واتساب</div></div></a>`;
  };
  draw(); if (S.obits === null || S.obitErr) { S.obitErr = false; await loadObits(); if (location.pathname === '/obits') draw(); }
}
async function pageWeddings(el) {
  setMeta('ركن الأفراح والتهاني', 'أفراح ومسرات المنيزلة');
  const draw = () => { el.innerHTML = `<div class="plaque green">بارك الله لهما وبارك عليهما</div><h1 class="pt">ركن الأفراح والتهاني</h1>${S.weddings === null ? '<p class="empty">جارٍ التحميل…</p>' : S.weddings.length ? `<div class="grid">${S.weddings.map(card).join('')}</div>` : '<p class="empty">لا توجد أخبار حالياً</p>'}`; };
  draw();
  if (S.weddings === null) { try { S.weddings = (await loadByCat('أفراح')) || []; remember(S.weddings); } catch (e) { S.weddings = S.posts.filter(p => /افراح|مسرات/.test(nk(p.cat))); } if (location.pathname === '/weddings') draw(); }
}
function pageSaved() {
  setMeta('المحفوظة', 'الأخبار التي حفظتها');
  return `<h1 class="pt">المحفوظة</h1>${S.saved.length ? `<div class="list">${S.saved.map(p => row(p)).join('')}</div>` : '<p class="empty"><span class="material-symbols-rounded big">bookmark</span><br>لا توجد أخبار محفوظة</p>'}`;
}
async function pageSearch(q, el) {
  setMeta('بحث: ' + q, 'نتائج البحث');
  const k = q.trim(); const local = allKnown().filter((p, i, a) => a.findIndex(x => x.id === p.id) === i && ((p.title || '') + ' ' + (p.excerpt || '')).includes(k));
  const form = `<form class="sform" role="search"><input name="q" type="search" value="${esc(k)}" placeholder="ابحث في الأخبار…" aria-label="بحث" ${k ? '' : 'autofocus'}><button class="btn" type="submit">بحث</button></form>`;
  const draw = list => { el.innerHTML = `<h1 class="pt">بحث</h1>${form}${k ? `<h2 class="sh">نتائج «${esc(k)}»</h2>${list.length ? `<div class="list">${list.map(row).join('')}</div>` : '<p class="empty">لا توجد نتائج</p>'}` : ''}`; };
  if (!k) { draw([]); return; }
  draw(local);
  try { const r = (await api('posts?search=' + encodeURIComponent(k) + '&per_page=20&_embed=author,wp:featuredmedia,wp:term')).map(fromWP).filter(Boolean); remember(r); if (location.search.includes(encodeURIComponent(k))) draw(r.length ? r : local); } catch (e) {}
}

/* ---------- Article ---------- */
function articleHTML(p, full) {
  const paras = (p.paras && p.paras.length ? p.paras : (p.excerpt ? [p.excerpt] : []));
  return `<article class="art">
  <div class="art-top"><button class="icon" data-back aria-label="رجوع"><span class="material-symbols-rounded">arrow_forward</span></button>
  <div class="art-acts"><button class="icon" data-fs="-1" aria-label="تصغير الخط">A-</button><button class="icon" data-fs="1" aria-label="تكبير الخط">A+</button>
  <button class="icon ${isSaved(p.id) ? 'on' : ''}" data-save="${p.id}" aria-label="حفظ"><span class="material-symbols-rounded">bookmark</span></button>
  <button class="icon" data-share="${esc(p.title)}" aria-label="مشاركة"><span class="material-symbols-rounded">share</span></button></div></div>
  ${img(p, true) ? `<img class="art-img" src="${esc(img(p, true))}" alt="" onerror="this.remove()">` : ''}
  <div class="meta">${badges(p)}</div>
  ${p.subtitle ? `<div class="art-sub">${esc(p.subtitle)}</div>` : ''}
  <h1>${esc(p.title)}</h1>
  <div class="meta dim">${p.author ? esc(p.author) + ' · ' : ''}${esc(fullDate(p.date))}${p.views ? ' · ' + AR(p.views) + ' مشاهدة' : ''}</div>
  <div class="art-tools"><button class="btn" data-tts><span class="material-symbols-rounded">play_arrow</span><span>استمع للخبر</span></button>
  <a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + location.origin + link(p))}" target="_blank" rel="noopener">واتساب</a></div>
  <div class="body">${paras.length ? paras.map(t => `<p>${esc(t)}</p>`).join('') : '<p class="empty">جارٍ تحميل النص…</p>'}${full ? '' : `<div class="skel"></div>`}</div>
  ${p.gallery && p.gallery.length ? `<h2 class="sh">صور الخبر</h2><div class="gal">${p.gallery.map(g => `<a href="${esc(g.src)}" target="_blank" rel="noopener"><img src="${esc(g.th)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
  <a class="btn ghost" href="${esc(p.link)}" target="_blank" rel="noopener">عرض الخبر على موقع الصحيفة</a>
  <section class="comments" id="comments"><h2 class="sh">التعليقات</h2><div id="clist" class="dim">جارٍ التحميل…</div>${p.commentsClosed ? '<p class="dim">التعليقات مغلقة على هذا الخبر</p>' : `<form id="cform"><input name="n" placeholder="الاسم (اختياري)" maxlength="60"><input name="e" type="email" placeholder="البريد (اختياري)"><textarea name="t" required maxlength="500" placeholder="اكتب تعليقك…" rows="3"></textarea><button class="btn" type="submit">إرسال التعليق</button></form>`}</section>
  <div id="related"></div></article>`;
}
async function pageArticle(id, opinion, el) {
  let p = allKnown().find(x => x.id === id);
  const key = (opinion ? 'o' : 'p') + id;
  if (S.cache[key]) p = S.cache[key];
  if (p) { el.innerHTML = articleHTML(p, !!p.full); setMeta(p.title, p.excerpt || p.subtitle || '', img(p, true)); }
  else el.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
  try {
    const x = await api((opinion ? 'articles/' : 'posts/') + id + '?_embed=author,wp:featuredmedia,wp:term');
    const f = fromWP(x); if (!f) throw 0;
    if (opinion) { const au = AUTHORS[x.author]; f.opinion = true; f.cat = 'مقالات'; f.author = (au && au.n) || ((((x._embedded || {}).author || [])[0] || {}).name) || (p && p.author) || 'كاتب في أصداء الديرة'; f.thumb = f.thumb || (au && au.img) || ''; }
    S.cache[key] = f; p = f;
    if (location.pathname === link(f)) { el.innerHTML = articleHTML(f, true); setMeta(f.title, f.excerpt || f.subtitle || '', img(f, true)); }
  } catch (e) { if (!p) { el.innerHTML = '<p class="empty">تعذّر تحميل الخبر. <a href="' + SITE + '/' + id + '.html" target="_blank" rel="noopener">افتحه على موقع الصحيفة</a></p>'; return; } const sk = $('.skel', el); if (sk) sk.outerHTML = `<p class="dim sm">تعذّر تحميل النص الكامل — <a href="${esc(p.link)}" target="_blank" rel="noopener">اقرأه على الموقع</a></p>`; }
  if (location.pathname !== link(p)) return;
  loadComments(p);
  const rel = S.posts.filter(x => x.id !== p.id && (x.catKeys || []).some(k => (p.catKeys || []).includes(k))).slice(0, 3);
  const r = $('#related', el); if (r && rel.length) r.innerHTML = section('من نفس القسم', '', `<div class="grid">${rel.map(card).join('')}</div>`);
}
async function loadComments(p) {
  const box = $('#clist'); if (!box) return;
  try {
    const list = await api('comments?post=' + p.id + '&per_page=50&order=asc&_fields=id,author_name,date,content,parent');
    const t = document.createElement('div');
    box.className = '';
    box.innerHTML = list.length ? list.map(c => { t.innerHTML = c.content.rendered; return `<div class="cm ${c.parent ? 'rep' : ''}"><span class="ini">${esc((c.author_name || 'ز')[0])}</span><div><b>${esc(c.author_name || 'زائر')}</b> <span class="dim sm">${esc(ago(c.date))}</span><p>${esc(t.textContent.trim())}</p></div></div>`; }).join('') : '<p class="dim">كن أول من يعلّق</p>';
  } catch (e) { box.textContent = 'تعذّر تحميل التعليقات'; }
}
async function sendComment(form) {
  const id = +location.pathname.split('/').pop(); const d = new FormData(form); const text = (d.get('t') || '').trim(); if (!text) return;
  const btn = $('button', form); btn.disabled = true;
  try {
    const r = await fetch(SITE + '/wp-json/wp/v2/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post: id, author_name: d.get('n') || 'زائر', author_email: d.get('e') || '', content: text }) });
    if (!r.ok) throw 0;
    form.reset(); toast('تم الإرسال — بانتظار مراجعة الإدارة');
  } catch (e) { toast('تعذّر إرسال التعليق، حاول لاحقاً'); }
  btn.disabled = false;
}

/* ---------- Router ---------- */
let speaking = false;
function stopTTS() { try { speechSynthesis.cancel(); } catch (e) {} speaking = false; }
async function route() {
  stopTTS();
  const path = decodeURIComponent(location.pathname).replace(/\/+$/, '') || '/';
  const el = app; let m;
  document.body.dataset.page = path.split('/')[1] || 'home';
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (path === '/' ? 'home' : path.split('/')[1])));
  if (path === '/') el.innerHTML = pageHome();
  else if (path === '/categories') el.innerHTML = pageCats();
  else if ((m = path.match(/^\/c\/(.+)$/))) pageCat(m[1], el);
  else if (path === '/videos') el.innerHTML = pageVideos();
  else if (path === '/obits') pageObits(el);
  else if (path === '/weddings') pageWeddings(el);
  else if (path === '/saved') el.innerHTML = pageSaved();
  else if (path === '/search') pageSearch(new URLSearchParams(location.search).get('q') || '', el);
  else if ((m = path.match(/^\/(news|opinion)\/(\d+)$/))) pageArticle(+m[2], m[1] === 'opinion', el);
  else el.innerHTML = '<p class="empty">الصفحة غير موجودة</p><a class="btn" href="/" data-link>العودة للرئيسية</a>';
  window.scrollTo(0, 0);
}
function go(url) { history.pushState(null, '', url); route(); }
function updateStatus() { $$('.status').forEach(s => { s.className = 'status ' + (S.live ? 'live' : ''); s.innerHTML = '<i></i>' + (S.live ? 'مباشر من الموقع' : (S.loading ? 'جارٍ التحديث…' : 'نسخة محفوظة')); }); }

/* ---------- Settings ---------- */
function applySettings() {
  const dark = S.settings.dark == null ? matchMedia('(prefers-color-scheme: dark)').matches : S.settings.dark;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.setProperty('--fs', S.settings.fs);
  const ic = $('#theme .material-symbols-rounded'); if (ic) ic.textContent = dark ? 'light_mode' : 'dark_mode';
}
function toggleSave(id) {
  const p = allKnown().find(x => x.id === id) || S.cache['p' + id] || S.cache['o' + id]; if (!p) return;
  if (isSaved(id)) S.saved = S.saved.filter(x => x.id !== id);
  else S.saved.unshift({ id: p.id, title: p.title, thumb: p.thumb, img: p.img, cat: p.cat, date: p.date, subtitle: p.subtitle || '', opinion: !!p.opinion, catKeys: p.catKeys });
  store.set('ald_saved', S.saved); toast(isSaved(id) ? 'تم الحفظ' : 'أُزيل من المحفوظات');
  $$('[data-save="' + id + '"]').forEach(b => b.classList.toggle('on', isSaved(id)));
  const sb = $('#savedCount'); if (sb) { sb.textContent = S.saved.length ? AR(S.saved.length) : ''; sb.hidden = !S.saved.length; }
}
async function share(text) {
  const url = location.href;
  try { if (navigator.share) { await navigator.share({ title: document.title, text, url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); } catch (e) { toast(url); }
}
function tts(btn) {
  if (!('speechSynthesis' in window)) { toast('القراءة الصوتية غير مدعومة في هذا المتصفح'); return; }
  if (speaking) { stopTTS(); btn.lastElementChild.textContent = 'استمع للخبر'; btn.firstElementChild.textContent = 'play_arrow'; return; }
  const text = [$('.art h1').textContent, ...$$('.art .body p').map(p => p.textContent)].join('. ');
  const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.onend = () => { speaking = false; btn.lastElementChild.textContent = 'استمع للخبر'; btn.firstElementChild.textContent = 'play_arrow'; };
  speechSynthesis.speak(u); speaking = true; btn.lastElementChild.textContent = 'إيقاف'; btn.firstElementChild.textContent = 'stop';
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.target !== '_blank') { e.preventDefault(); go(a.getAttribute('href')); return; }
  const t = e.target.closest('[data-yt],[data-save],[data-share],[data-fs],[data-back],[data-tts],#theme,#refresh,.m-x,#modal');
  if (!t) return;
  if (t.dataset.yt) openVideo(t.dataset.yt, t.dataset.vert, t.dataset.title);
  else if (t.dataset.save) toggleSave(+t.dataset.save);
  else if (t.dataset.share !== undefined) share(t.dataset.share);
  else if (t.dataset.fs) { S.settings.fs = Math.min(1.5, Math.max(.85, +(S.settings.fs + (+t.dataset.fs) * .1).toFixed(2))); store.set('ald_settings', S.settings); applySettings(); }
  else if (t.dataset.back !== undefined) { history.length > 1 ? history.back() : go('/'); }
  else if (t.dataset.tts !== undefined) tts(t);
  else if (t.id === 'theme') { S.settings.dark = document.documentElement.dataset.theme !== 'dark'; store.set('ald_settings', S.settings); applySettings(); }
  else if (t.id === 'refresh') { t.classList.add('spin'); Promise.all([loadPosts(false), loadOpinions(), loadVideos()]).then(() => { t.classList.remove('spin'); if (['/', ''].includes(location.pathname)) route(); }); }
  else if (t.classList.contains('m-x') || (t.id === 'modal' && e.target === t)) closeModal();
});
document.addEventListener('submit', e => {
  if (e.target.id === 'cform') { e.preventDefault(); sendComment(e.target); }
  if (e.target.id === 'sform' || e.target.classList.contains('sform')) { e.preventDefault(); const q = new FormData(e.target).get('q').trim(); if (q) go('/search?q=' + encodeURIComponent(q)); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('popstate', route);

/* ---------- Init ---------- */
applySettings();
const sb = $('#savedCount'); if (sb && S.saved.length) { sb.textContent = AR(S.saved.length); sb.hidden = false; }
route();
(async () => {
  await loadPosts(true);
  await Promise.all([loadOpinions(), loadVideos(), loadObits()]);
  if (location.pathname === '/') route();
})();
setInterval(async () => { if (document.hidden) return; await loadPosts(true); if (location.pathname === '/') route(); }, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (S.last || 0) > 3e5) { S.last = Date.now(); loadPosts(true); } });
})();
