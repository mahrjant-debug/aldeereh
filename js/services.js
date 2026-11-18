/* الخدمات: الصلاة والطقس، التقويم، الدليل، الاستطلاع، الوظائف، عن المنيزلة، متابعاتي، أرسل خبرك، الودجت، الإحصاءات، التثبيت */
(function () {
'use strict';
const { S, $, $$, esc, store, toast, AR, ago, go, link, section, card, row, page } = AL;
const R = (path, fn) => AL.routes.push([path, fn]);
AL.services = [
  { n: 'الصلاة والطقس', i: 'mosque', h: '/prayer' }, { n: 'التقويم', i: 'calendar_month', h: '/calendar' }, { n: 'دليل المنيزلة', i: 'travel_explore', h: '/directory' },
  { n: 'استطلاع الأسبوع', i: 'ballot', h: '/poll' }, { n: 'الوظائف', i: 'work', h: '/jobs' }, { n: 'عن المنيزلة', i: 'info', h: '/about' },
  { n: 'متابعاتي', i: 'notifications_active', h: '/follows' }, { n: 'الودجت', i: 'widgets', h: '/widget' }, { n: 'أرسل خبرك', i: 'add_a_photo', h: '/send' }
];
const pad = n => String(n).padStart(2, '0');
const hm12 = hm => { const [h, m] = hm.split(':').map(Number); return AR(((h + 11) % 12) + 1) + ':' + AR(pad(m)) + ' ' + (h >= 12 ? 'م' : 'ص'); };

/* ================= الصلاة والطقس ================= */
let prayer = store.get('ald_prayer', null), weather = store.get('ald_weather', null);
async function fetchPrayer(force) {
  const m = S.settings.pMethod ?? 4, d = new Date(), key = d.toDateString() + '|' + m;
  if (!force && prayer && prayer.key === key) return prayer;
  if (!S.online) return prayer;
  try {
    const ds = pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
    const r = await fetch('https://api.aladhan.com/v1/timings/' + ds + '?latitude=' + MZ.lat + '&longitude=' + MZ.lon + '&method=' + m + '&timezonestring=Asia/Riyadh'); if (!r.ok) throw 0;
    const j = (await r.json()).data; const hj = j.date && j.date.hijri;
    prayer = { key, t: j.timings, hijri: hj ? (hj.weekday.ar + ' ' + hj.day + ' ' + hj.month.ar + ' ' + hj.year + 'هـ') : '' }; store.set('ald_prayer', prayer);
  } catch (e) {}
  return prayer;
}
async function fetchWeather() {
  if (weather && Date.now() - weather.at < 1800000) return weather;
  if (!S.online) return weather;
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + MZ.lat + '&longitude=' + MZ.lon + '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FRiyadh&forecast_days=5'); if (!r.ok) throw 0;
    const j = await r.json(); weather = { at: Date.now(), cur: j.current, daily: j.daily }; store.set('ald_weather', weather);
  } catch (e) {}
  return weather;
}
function prayerList() {
  if (!prayer || !prayer.t) return []; const now = new Date();
  return ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(k => { const hm = String(prayer.t[k] || '00:00').slice(0, 5); const [h, mi] = hm.split(':').map(Number); const d = new Date(now); d.setHours(h, mi, 0, 0); return { k, n: PNAMES[k], d, hm }; });
}
function nextPrayer() {
  const L = prayerList().filter(x => x.k !== 'Sunrise'); if (!L.length) return null; const now = Date.now();
  return L.find(x => x.d.getTime() > now) || Object.assign({}, L[0], { d: new Date(L[0].d.getTime() + 864e5), tomorrow: true });
}
function left(ms) { const m = Math.max(0, Math.floor(ms / 6e4)), h = Math.floor(m / 60); return (h ? AR(h) + ' س ' : '') + AR(m % 60) + ' د'; }
let adhanT;
AL.scheduleAdhan = () => {
  clearTimeout(adhanT); const s = S.settings; if (!s.adhan || !s.notif || document.hidden) return; const n = nextPrayer(); if (!n) return;
  const ms = n.d.getTime() - Date.now(); if (ms <= 0 || ms > 2e9) return;
  adhanT = setTimeout(() => { AL.pushNotif({ title: 'حان الآن موعد أذان ' + n.n + ' حسب توقيت المنيزلة', cat: 'أوقات الصلاة', prayer: true }, { ms: 6000 }); setTimeout(AL.scheduleAdhan, 60000); }, ms);
};
function stripHTML() {
  const n = nextPrayer(), w = weather && weather.cur;
  if (!n && !w) return '';
  return `<a class="pstrip" href="/prayer" data-link>${n ? `<span class="material-symbols-rounded">mosque</span><div><b>${esc(n.n)} ${hm12(n.hm)}</b><div class="dim sm">بعد ${left(n.d - Date.now())}</div></div>` : ''}${w ? `<span class="sp"></span><span class="material-symbols-rounded">${WMAP(w.weather_code)[1]}</span><div><b>${AR(Math.round(w.temperature_2m))}°</b><div class="dim sm">${WMAP(w.weather_code)[0]}</div></div>` : ''}</a>`;
}
async function fillStrip() {
  const box = $('#pstrip'); if (!box) return; box.innerHTML = stripHTML();
  await Promise.all([fetchPrayer(), fetchWeather()]); if ($('#pstrip')) { $('#pstrip').innerHTML = stripHTML(); AL.scheduleAdhan(); }
}
R('/prayer', async el => {
  AL.setMeta('الصلاة والطقس', 'أوقات الصلاة والطقس في المنيزلة');
  const draw = () => {
    const L = prayerList(), n = nextPrayer(), w = weather;
    el.innerHTML = page('الصلاة والطقس', `<div class="dim" style="margin:-8px 0 12px">${esc(prayer && prayer.hijri || AL.hijri())} · ${esc(new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
    ${n ? `<div class="pnext"><div class="dim sm">${n.tomorrow ? 'صلاة الغد' : 'الصلاة القادمة'}</div><h2>${esc(n.n)}</h2><div class="pbig">${hm12(n.hm)}</div><div id="pcd">بعد ${left(n.d - Date.now())}</div></div>` : '<p class="empty">جارٍ تحميل أوقات الصلاة…</p>'}
    ${L.length ? `<div class="plist">${L.map(x => `<div class="${n && x.k === n.k ? 'on' : ''}"><span>${x.n}</span><b>${hm12(x.hm)}</b></div>`).join('')}</div>` : ''}
    <div class="setrow"><span>طريقة الحساب</span><div class="seg"><button class="${S.settings.pMethod === 4 ? 'on' : ''}" data-set="pMethod:4">أم القرى</button><button class="${S.settings.pMethod === 0 ? 'on' : ''}" data-set="pMethod:0">الجعفري</button></div></div>
    <div class="setrow"><span>تنبيه الأذان (والصفحة مفتوحة)</span><button class="tg ${S.settings.adhan ? 'on' : ''}" data-tg="adhan" aria-label="تنبيه الأذان"><i></i></button></div>
    <h2 class="sh">الطقس في المنيزلة</h2>
    ${w && w.cur ? `<div class="wcur"><span class="material-symbols-rounded">${WMAP(w.cur.weather_code)[1]}</span><div><b class="wt">${AR(Math.round(w.cur.temperature_2m))}°</b><div>${WMAP(w.cur.weather_code)[0]}</div></div><div class="dim sm">الرطوبة ${AR(Math.round(w.cur.relative_humidity_2m))}٪<br>الرياح ${AR(Math.round(w.cur.wind_speed_10m))} كم/س</div></div>
    <div class="wdays">${w.daily.time.slice(1, 5).map((d, i) => `<div><div class="dim sm">${new Date(d).toLocaleDateString('ar-SA', { weekday: 'short' })}</div><span class="material-symbols-rounded">${WMAP(w.daily.weather_code[i + 1])[1]}</span><b>${AR(Math.round(w.daily.temperature_2m_max[i + 1]))}°</b><span class="dim sm">${AR(Math.round(w.daily.temperature_2m_min[i + 1]))}°</span></div>`).join('')}</div>` : '<p class="empty">تعذّر تحميل الطقس</p>'}
    <p class="dim sm">أوقات الصلاة من Aladhan، والطقس من Open-Meteo.</p>`);
  };
  draw(); await Promise.all([fetchPrayer(true), fetchWeather()]); if (AL.live('/prayer')) { draw(); AL.scheduleAdhan(); }
  AL.timers.pc = setInterval(() => { const n = nextPrayer(), c = $('#pcd'); if (n && c) c.textContent = 'بعد ' + left(n.d - Date.now()); }, 30000);
});

/* ================= التقويم والتذكيرات ================= */
let occC = null;
function occasions() {
  const key = new Date().toDateString(); if (occC && occC.key === key) return occC.list;
  const out = [], found = new Set(); const d0 = new Date(); d0.setHours(12, 0, 0, 0); let fh = null;
  try { fh = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }); } catch (e) {}
  for (let i = 0; i < 400 && found.size < OCC.length; i++) {
    const d = new Date(d0.getTime() + i * 864e5); let hm = 0, hd = 0;
    if (fh) { try { const ps = fh.formatToParts(d); hm = +ps.find(x => x.type === 'month').value; hd = +ps.find(x => x.type === 'day').value; } catch (e) {} }
    OCC.forEach((o, j) => { if (found.has(j)) return; if ((o.h && o.h[0] === hm && o.h[1] === hd) || (o.g && o.g[0] === d.getMonth() + 1 && o.g[1] === d.getDate())) { found.add(j); out.push({ n: o.n, d, days: i }); } });
  }
  out.sort((a, b) => a.days - b.days); occC = { key, list: out }; return out;
}
const rems = () => store.get('ald_rem', []);
function addReminder(title, at) { const L = rems(); L.push({ id: Date.now(), title, at, done: false }); store.set('ald_rem', L); toast('سيُذكَّرك التطبيق عند فتحه في الموعد'); }
function checkReminders() {
  const L = rems(); let ch = false; L.forEach(r => { if (!r.done && Date.now() >= r.at) { r.done = true; ch = true; AL.pushNotif({ title: 'تذكير: ' + r.title, cat: 'تذكير' }, { force: true }); } }); if (ch) store.set('ald_rem', L);
}
setInterval(checkReminders, 60000); setTimeout(checkReminders, 4000);
R('/calendar', el => {
  AL.setMeta('التقويم', 'التقويم والمناسبات');
  const draw = () => {
    const O = occasions(), ev = S.posts.filter(p => /فعالية|مهرجان|حفل|ملتقى|معرض|دورة|ندوة/.test(p.title)).slice(0, 6), R2 = rems().filter(r => !r.done || Date.now() - r.at < 864e5);
    el.innerHTML = page('التقويم', `<div class="cal"><div><b>${esc(AL.hijri())}</b></div><div class="dim">${esc(new Date().toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</div></div>
    <h2 class="sh">المناسبات القادمة</h2><div class="list">${O.map(o => `<div class="row"><div style="flex:1"><h3>${esc(o.n)}</h3><div class="dim sm">${o.days === 0 ? 'اليوم' : 'بعد ' + AR(o.days) + ' يوم'} · ${esc(o.d.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long' }))}</div></div><button class="btn ghost" data-remind="${esc(o.n)}|${o.d.getTime()}">ذكّرني</button></div>`).join('')}</div>
    ${ev.length ? `<h2 class="sh">فعاليات من الصحيفة</h2><div class="list">${ev.map(p => row(p)).join('')}</div>` : ''}
    <h2 class="sh">تذكيراتي</h2>${R2.length ? `<div class="list">${R2.map(r => `<div class="row"><div style="flex:1"><h3>${esc(r.title)}</h3><div class="dim sm">${esc(new Date(r.at).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }))}${r.done ? ' · تم' : ''}</div></div><button class="icon" data-delrem="${r.id}" aria-label="حذف"><span class="material-symbols-rounded">delete</span></button></div>`).join('')}</div>` : '<p class="dim">لا توجد تذكيرات</p>'}`);
  };
  draw();
});

/* ================= الدليل ================= */
R('/directory', el => {
  AL.setMeta('دليل المنيزلة', 'ابحث عن الخدمات داخل المنيزلة');
  el.innerHTML = page('دليل المنيزلة', `<p class="dim">اختر تصنيفاً لفتح نتائجه على خرائط Google داخل المنيزلة.</p><div class="cats">${DIRCATS.map(c => `<a class="cat" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c[2] + ' المنيزلة الأحساء')}" target="_blank" rel="noopener"><span class="material-symbols-rounded">${c[1]}</span>${esc(c[0])}</a>`).join('')}</div>
  <a class="cta" href="https://wa.me/966594002003?text=${encodeURIComponent('أرغب بإضافة نشاطي التجاري إلى دليل المنيزلة')}" target="_blank" rel="noopener"><span class="material-symbols-rounded">storefront</span><div><b>أضف نشاطك التجاري</b><div class="sm">تواصل معنا عبر واتساب</div></div></a>`);
});

/* ================= الاستطلاع ================= */
const myVote = () => store.get('ald_vote_' + POLL0.id, null);
function pollHTML() {
  const v = myVote();
  return `<div class="poll"><div class="dim sm">استطلاع الأسبوع</div><h3>${esc(POLL0.q)}</h3>${POLL0.opts.map((o, i) => `<button class="po ${v === i ? 'on' : ''}" data-vote="${i}" ${v != null ? 'disabled' : ''}>${esc(o)}${v === i ? '<span class="material-symbols-rounded">check_circle</span>' : ''}</button>`).join('')}${v != null ? '<div class="dim sm">شكراً لمشاركتك، تم تسجيل صوتك على هذا الجهاز. ستظهر النسب عند ربط الاستطلاع بالموقع.</div>' : ''}</div>`;
}
R('/poll', el => { AL.setMeta('استطلاع الأسبوع', POLL0.q); el.innerHTML = page('استطلاع الأسبوع', pollHTML()); });

/* ================= الوظائف ================= */
function jobDeadline(p) {
  if (p._dl !== undefined) return p._dl;
  const txt = [p.title, ...(p.paras || []), p.excerpt || ''].join(' ').replace(/[٠-٩]/g, x => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))); const pd = new Date(p.date); let best = null;
  const re = new RegExp('([0-9]{1,2})[ ]*(?:من[ ]*)?(' + GM.join('|') + '|ابريل|إبريل)[ ]*(?:م[ ]*)?([0-9]{4})?', 'g'); let m;
  while ((m = re.exec(txt))) { const mo = /بريل/.test(m[2]) ? 3 : GM.indexOf(m[2]); const y = m[3] ? +m[3] : pd.getFullYear(); const d = new Date(y, mo, +m[1], 23, 59); if (!isNaN(d) && d >= pd && d - pd < 200 * 864e5 && (!best || d > best)) best = d; }
  const re2 = /([0-9]{1,2})[/-]([0-9]{1,2})[/-](20[0-9]{2})/g; while ((m = re2.exec(txt))) { const d = new Date(+m[3], +m[2] - 1, +m[1], 23, 59); if (!isNaN(d) && d >= pd && d - pd < 200 * 864e5 && (!best || d > best)) best = d; }
  p._dl = best; return best;
}
const remAt = d => { const r = new Date(d); r.setDate(r.getDate() - 1); r.setHours(9, 0, 0, 0); return Math.max(Date.now() + 6e4, r.getTime()); };
AL.jobChip = p => {
  const d = jobDeadline(p); if (!d) return '';
  const days = Math.ceil((d - Date.now()) / 864e5);
  if (days < 0) return '<div class="chip end">انتهى التقديم</div>';
  return `<div class="chip">${days === 0 ? 'آخر يوم للتقديم' : 'متبقٍ ' + AR(days) + ' يوم'}</div><button class="btn ghost sm" data-remind="${esc('موعد التقديم: ' + p.title)}|${remAt(d)}">ذكّرني قبل الموعد</button>`;
};
R('/jobs', el => { history.replaceState(null, '', '/c/' + encodeURIComponent('وظائف وتسجيلات')); AL.route(); });

/* ================= عن المنيزلة ================= */
let about = null;
R('/about', async el => {
  AL.setMeta('عن المنيزلة', 'نبذة عن المنيزلة وصحيفة أصداء الديرة');
  const draw = () => { el.innerHTML = page('عن المنيزلة', `<p class="body">المنيزلة بلدة في محافظة الأحساء بالمنطقة الشرقية. وصحيفة أصداء الديرة الإلكترونية تُعنى بأخبار المنيزلة والأحساء ومناسباتها.</p>
  <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('المنيزلة الأحساء')}" target="_blank" rel="noopener">عرض المنيزلة على الخريطة</a>
  ${about && about.length ? `<h2 class="sh">صفحات تعريفية</h2><div class="list">${about.map(p => `<a class="row" href="${esc(p.link)}" target="_blank" rel="noopener"><div><h3>${esc(p.title)}</h3></div></a>`).join('')}</div>` : ''}
  <h2 class="sh">تواصل معنا</h2><div class="list"><a class="row" href="https://wa.me/966594002003" target="_blank" rel="noopener"><div><h3>واتساب الصحيفة</h3></div></a><a class="row" href="https://t.me/aldeereh" target="_blank" rel="noopener"><div><h3>قناة تيليجرام</h3></div></a><a class="row" href="${SITE}" target="_blank" rel="noopener"><div><h3>aldeereh.com</h3></div></a></div>`); };
  draw();
  if (about === null && S.online) { try { about = (await AL.api('pages?per_page=50&_fields=id,title,link')).map(x => { const t = document.createElement('textarea'); t.innerHTML = x.title.rendered; return { title: t.value, link: x.link }; }).filter(p => /المنيزلة|منيزل|عائل|أسر|نبذة|تاريخ|من نحن|عن الصحيفة|الديرة|عن الموقع/.test(p.title)); } catch (e) { about = []; } if (AL.live('/about')) draw(); }
});

/* ================= متابعاتي ================= */
R('/follows', el => {
  AL.setMeta('متابعاتي', 'الكتّاب والأقسام التي تتابعها');
  const authors = [...new Set([...S.follows.authors, ...S.opinions.map(o => o.author)])].filter(Boolean);
  el.innerHTML = page('متابعاتي', `<p class="dim">يصلك إشعار عند نشر مقال جديد لمن تتابعهم، وعند نشر أخبار الأقسام المتابَعة.</p>
  <h2 class="sh">الكتّاب</h2><div class="chipsw">${authors.map(a => `<button class="chipb ${S.follows.authors.includes(a) ? 'on' : ''}" data-followauthor="${esc(a)}">${esc(a)}</button>`).join('') || '<span class="dim">لا يوجد كتّاب بعد</span>'}</div>
  <h2 class="sh">الأقسام</h2><div class="chipsw">${CATS.filter(c => c.n !== 'مقالات').map(c => `<button class="chipb ${S.settings.notifCats.includes(c.n) ? 'on' : ''}" data-followcat="${esc(c.n)}">${esc(c.n)}</button>`).join('')}</div>`);
});

/* ================= أرسل خبرك ================= */
let files = [], loc = null;
const thumbs = () => $('#sthumbs') && ($('#sthumbs').innerHTML = files.map((f, i) => `<div class="th"><img src="${URL.createObjectURL(f)}" alt=""><button data-rmf="${i}" aria-label="حذف">×</button></div>`).join(''));
R('/send', el => {
  AL.setMeta('أرسل خبرك', 'شارك الصحيفة خبراً أو صوراً'); files = []; loc = null;
  el.innerHTML = page('أرسل خبرك', `<p class="dim">اكتب الخبر وأرفق الصور، وسيصل إلى واتساب الصحيفة.</p>
  <form id="sform2"><input name="n" placeholder="الاسم (اختياري)" maxlength="60"><textarea name="t" rows="5" required placeholder="اكتب تفاصيل الخبر…"></textarea>
  <div class="dim sm" id="serr" style="color:#C0392B"></div><div id="sthumbs" class="thumbs"></div>
  <div class="acts" style="justify-content:flex-start"><label class="btn ghost"><span class="material-symbols-rounded">image</span>إضافة صور<input type="file" accept="image/*" multiple hidden id="sfiles"></label><button type="button" class="btn ghost" data-loc><span class="material-symbols-rounded">my_location</span><span id="loct">إضافة موقعي</span></button></div>
  <button class="btn big" type="submit">إرسال إلى الصحيفة</button></form>`);
});
async function sendNews(form) {
  const d = new FormData(form), text = (d.get('t') || '').trim(), err = $('#serr');
  if (text.length < 5) { err.textContent = 'اكتب تفاصيل الخبر'; return; }
  const msg = ['خبر من قارئ — موقع أصداء الديرة', (d.get('n') || '').trim() ? 'الاسم: ' + d.get('n').trim() : '', text, loc ? 'الموقع: ' + loc : ''].filter(Boolean).join('\n');
  try {
    if (files.length && navigator.canShare && navigator.canShare({ files })) await navigator.share({ files, text: msg });
    else { window.open('https://wa.me/966594002003?text=' + encodeURIComponent(msg), '_blank'); if (files.length) toast('أرفق الصور في محادثة واتساب بعد فتحها'); }
  } catch (e) { return; }
  form.reset(); files = []; loc = null; thumbs();
}
document.addEventListener('change', e => { if (e.target.id === 'sfiles') { files = [...files, ...e.target.files].slice(0, 6); thumbs(); e.target.value = ''; } });
document.addEventListener('submit', e => { if (e.target.id === 'sform2') { e.preventDefault(); sendNews(e.target); } });

/* ================= الودجت ================= */
R('/widget', async el => {
  AL.setMeta('الودجت', 'معاينة ودجت الشاشة الرئيسية');
  await Promise.all([fetchPrayer(), fetchWeather()]);
  const p = S.posts[0], n = nextPrayer(), b = S.posts.find(x => x.breaking);
  el.innerHTML = page('الودجت', `<p class="dim">معاينة لشكل ودجت الشاشة الرئيسية. الودجت الحقيقي يتطلب تطبيقاً على الجوال.</p><div class="wg">
  <div class="w1"><div class="dim sm">آخر خبر</div><b>${esc(p.title)}</b><div class="dim sm">${esc(ago(p.date))}</div></div>
  <div class="w2"><div class="dim sm">الصلاة القادمة</div>${n ? `<b>${esc(n.n)}</b><div>${hm12(n.hm)}</div>` : '<b>—</b>'}</div>
  <div class="w3 ${b ? 'red' : ''}"><div class="sm">${b ? 'عاجل' : 'لا يوجد عاجل'}</div><b>${b ? esc(b.title) : 'لا توجد أخبار عاجلة الآن'}</b></div></div>`);
});

/* ================= الإحصاءات (للإدارة) ================= */
R('/stats', el => {
  AL.setMeta('الإحصاءات', 'إحصاءات الإعلانات والقراءة');
  const A = AL.adStats(), reads = store.get('ald_reads', { cats: {}, posts: {} }), opens = store.get('ald_opens', { n: 0 });
  const rows = Object.entries(A).map(([k, v]) => ({ t: v.t, i: v.i, c: v.c, ctr: v.i ? (v.c / v.i * 100).toFixed(1) : '0.0' }));
  const cats = Object.entries(reads.cats).sort((a, b) => b[1] - a[1]);
  el.innerHTML = page('الإحصاءات', `<p class="dim">هذه الأرقام محفوظة على هذا الجهاز فقط (${AR(opens.n || 0)} فتحة للموقع).</p>
  <h2 class="sh">الإعلانات</h2>${rows.length ? `<table class="tb"><tr><th>الإعلان</th><th>الظهور</th><th>النقرات</th><th>النسبة</th></tr>${rows.map(r => `<tr><td>${esc(r.t)}</td><td>${AR(r.i)}</td><td>${AR(r.c)}</td><td>${AR(r.ctr)}٪</td></tr>`).join('')}</table>` : '<p class="dim">لا توجد بيانات</p>'}
  <h2 class="sh">القراءة حسب القسم</h2>${cats.length ? `<table class="tb">${cats.map(c => `<tr><td>${esc(c[0])}</td><td>${AR(c[1])}</td></tr>`).join('')}</table>` : '<p class="dim">لا توجد بيانات</p>'}
  <div class="acts" style="justify-content:flex-start;margin-top:16px"><button class="btn" data-csv>تصدير CSV</button><button class="btn ghost" data-resetstats>تصفير</button></div>`);
});
function exportCSV() {
  const A = AL.adStats(), reads = store.get('ald_reads', { cats: {} }); const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const lines = ['ad,impressions,clicks,ctr', ...Object.values(A).map(v => [q(v.t), v.i, v.c, v.i ? (v.c / v.i * 100).toFixed(2) : 0].join(',')), '', 'category,reads', ...Object.entries(reads.cats).map(([k, v]) => q(k) + ',' + v)];
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'aldeereh-stats.csv'; a.click();
}
AL.logRead = p => { try { const L = store.get('ald_reads', { cats: {}, posts: {} }); const c = p.cat || 'أخرى'; L.cats[c] = (L.cats[c] || 0) + 1; const e = L.posts[p.id] || { t: p.title, n: 0 }; e.n++; L.posts[p.id] = e; const ks = Object.keys(L.posts); if (ks.length > 200) ks.sort((a, b) => L.posts[a].n - L.posts[b].n).slice(0, ks.length - 200).forEach(k => delete L.posts[k]); store.set('ald_reads', L); } catch (e) {} };

/* ================= التثبيت (PWA) ================= */
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; const b = $('#installbox'); if (b) b.innerHTML = installHTML(); });
window.addEventListener('appinstalled', () => { deferred = null; const b = $('#installbox'); if (b) b.innerHTML = ''; });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const STORES = { ios: '', android: '' };
function installHTML(force) {
  if (standalone() || (!force && store.get('ald_inst_hide', false))) return '';
  if (!deferred && !ios() && !force) return '';
  return `<div class="inst"><span class="material-symbols-rounded">install_mobile</span><div style="flex:1"><b>ثبّت التطبيق على جوالك</b>${ios() ? '<ol class="sm"><li>اضغط زر المشاركة في Safari</li><li>اختر «إضافة إلى الشاشة الرئيسية»</li><li>اضغط «إضافة»</li></ol>' : '<div class="sm dim">وصول أسرع، ويعمل بملء الشاشة</div>'}
  ${STORES.ios || STORES.android ? `<div class="acts" style="justify-content:flex-start">${STORES.ios ? `<a class="btn ghost" href="${STORES.ios}">App Store</a>` : ''}${STORES.android ? `<a class="btn ghost" href="${STORES.android}">Google Play</a>` : ''}</div>` : ''}</div>
  ${deferred ? '<button class="btn" data-install>تثبيت</button>' : ''}<button class="icon" data-hideinst aria-label="إخفاء"><span class="material-symbols-rounded">close</span></button></div>`;
}
AL.installHTML = installHTML; AL.canInstall = () => !!deferred;
AL.installApp = async () => { if (!deferred) { toast(ios() ? 'استخدم زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»' : 'التثبيت غير متاح في هذا المتصفح'); return; } deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; };

/* ================= بطاقة الخط الكبير ================= */
function seniorHTML() {
  if (store.get('ald_senior', false) || S.settings.fs > 1) return '';
  return `<div class="senior"><div><b>هل الخط صغير عليك؟</b><div class="dim sm">اختر حجماً أكبر للقراءة براحة</div></div><div class="acts"><button class="btn ghost" data-fsset="1">عادي</button><button class="btn ghost" data-fsset="1.2">كبير</button><button class="btn" data-fsset="1.4">أكبر</button><button class="icon" data-senior aria-label="إخفاء"><span class="material-symbols-rounded">close</span></button></div></div>`;
}

/* ================= الربط بالصفحة الرئيسية ================= */
AL.hooks.afterHome = el => {
  fillStrip();
  const pb = $('#pollbox', el); if (pb) pb.innerHTML = pollHTML();
  const ib = $('#installbox', el); if (ib) ib.innerHTML = installHTML();
  const sn = $('#senior', el); if (sn) sn.innerHTML = seniorHTML();
  AL.timers.ps = setInterval(() => { if (!document.hidden && $('#pstrip')) $('#pstrip').innerHTML = stripHTML(); }, 60000);
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-remind],[data-delrem],[data-vote],[data-rmf],[data-loc],[data-csv],[data-resetstats],[data-install],[data-hideinst],[data-fsset],[data-senior]'); if (!t) return; const D = t.dataset;
  if (D.remind) { const [title, at] = D.remind.split('|'); addReminder(title, +at); if (AL.live('/calendar')) AL.route(); }
  else if (D.delrem) { store.set('ald_rem', rems().filter(r => r.id !== +D.delrem)); AL.route(); }
  else if (D.vote !== undefined) { store.set('ald_vote_' + POLL0.id, +D.vote); $$('.poll').forEach(p => p.outerHTML = pollHTML()); toast('تم تسجيل صوتك'); }
  else if (D.rmf !== undefined) { files.splice(+D.rmf, 1); thumbs(); }
  else if (D.loc !== undefined) {
    if (loc) { loc = null; $('#loct').textContent = 'إضافة موقعي'; return; }
    if (!navigator.geolocation) { toast('تحديد الموقع غير مدعوم'); return; }
    navigator.geolocation.getCurrentPosition(p => { loc = 'https://maps.google.com/?q=' + p.coords.latitude.toFixed(5) + ',' + p.coords.longitude.toFixed(5); $('#loct').textContent = 'تمت إضافة الموقع'; }, () => toast('تعذّر تحديد الموقع، فعّل الإذن'), { timeout: 8000 });
  }
  else if (D.csv !== undefined) exportCSV();
  else if (D.resetstats !== undefined) { if (confirm('تصفير كل الإحصاءات؟')) { AL.resetAdStats(); store.set('ald_reads', { cats: {}, posts: {} }); AL.route(); } }
  else if (D.install !== undefined) AL.installApp();
  else if (D.hideinst !== undefined) { store.set('ald_inst_hide', true); const b = $('#installbox'); b && (b.innerHTML = ''); }
  else if (D.fsset) { AL.setS({ fs: +D.fsset }); store.set('ald_senior', true); const s = $('#senior'); s && (s.innerHTML = ''); }
  else if (D.senior !== undefined) { store.set('ald_senior', true); const s = $('#senior'); s && (s.innerHTML = ''); }
});
})();
