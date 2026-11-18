/* الإشعارات: مركز التنبيهات، البنرات، العاجل، ساعات الهدوء، الملخص اليومي */
(function () {
'use strict';
const { S, $, $$, esc, store, toast, AR, ago, go, link } = AL;
S.notifs = store.get('ald_notifs', []);
const persist = () => { store.set('ald_notifs', S.notifs.slice(0, 40)); AL.updateBadges(); };

/* ---- sounds ---- */
let ac;
function ctx() { try { const C = window.AudioContext || window.webkitAudioContext; ac = ac || new C(); ac.resume && ac.resume(); return ac; } catch (e) { return null; } }
AL.chime = () => { const a = ctx(); if (!a) return; const t = a.currentTime;
  [[783.99, 0], [1174.66, .13], [1567.98, .26]].forEach(([f, d]) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.22, t + d + .02); g.gain.exponentialRampToValueAtTime(.001, t + d + .7); o.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + .75); }); };
AL.urgent = () => { const a = ctx(); if (!a) return; const t = a.currentTime;
  [0, .18, .36, .7, .88, 1.06].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = i % 2 ? 880 : 1320; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.28, t + d + .015); g.gain.exponentialRampToValueAtTime(.001, t + d + .16); o.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + .18); }); };

/* ---- banner ---- */
let bt;
function showBanner(n, ms) {
  let b = $('#banner'); if (!b) { b = document.createElement('div'); b.id = 'banner'; document.body.appendChild(b); }
  const href = n.digest ? '#' : n.postId ? '/news/' + n.postId : (n.href || '');
  if (n.breaking) {
    b.className = 'brk on';
    b.innerHTML = `<div class="bk-h"><span class="material-symbols-rounded">bolt</span>خبر عاجل<button class="bk-x" data-bnx aria-label="إغلاق"><span class="material-symbols-rounded">close</span></button></div>
    <div class="bk-b">${n.img ? `<img src="${esc(n.img)}" alt="">` : ''}<div><b>${esc(n.title)}</b></div></div>
    <div class="bk-a"><a class="btn wh" href="${href}" data-link data-bnx>اقرأ الآن</a><button class="btn gl" data-bnspeak="${esc(n.title)}">استمع</button></div>`;
  } else {
    b.className = 'nrm on';
    b.innerHTML = `<a class="bn" href="${href || '#'}" ${n.digest ? 'data-digest' : href ? 'data-link' : ''} data-bnx><img src="/assets/app-icon-192.png" alt=""><div><div class="dim sm">أصداء الديرة · ${esc(n.cat || '')}</div><b>${esc(n.title)}</b></div></a>`;
  }
  clearTimeout(bt); bt = setTimeout(() => { b.className = ''; }, ms || (n.breaking ? 9000 : 5200));
}
const inQuiet = () => { const s = S.settings; if (!s.quiet) return false; const h = new Date().getHours(); return s.qFrom > s.qTo ? (h >= s.qFrom || h < s.qTo) : (h >= s.qFrom && h < s.qTo); };

/* ---- generic push (adhan, digest, reminders…) ---- */
AL.pushNotif = (n, opt = {}) => {
  const s = S.settings; n = Object.assign({ id: Date.now() + Math.random(), time: Date.now(), read: false }, n);
  S.notifs.unshift(n); persist();
  if (!s.notif && !opt.force) return;
  showBanner(n, opt.ms);
  if (s.sound) (n.breaking ? AL.urgent() : AL.chime());
  if (s.vibrate && navigator.vibrate) try { navigator.vibrate(n.breaking ? [200, 80, 200, 80, 400] : [60, 40, 60]); } catch (e) {}
  try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('أصداء الديرة', { body: n.title, icon: '/assets/app-icon-192.png', tag: String(n.id) }); } catch (e) {}
};

/* ---- news notifications ---- */
AL.notify = (p, demo) => {
  const s = S.settings; if (!s.notif) return;
  if (!demo) {
    if (s.obitNotif === false && /ذمة الله|رحمة الله|الرفيق الأعلى/.test(p.title)) return;
    if (s.breakingOnly && !p.breaking) return;
    if (!p.breaking && !s.notifCats.some(c => (p.catKeys || []).some(k => k.includes(nk(c)) || nk(c).includes(k)))) return;
  }
  const n = { postId: p.id, title: p.title, cat: p.cat, breaking: !!p.breaking, img: p.thumb || p.img || '' };
  if (!demo && s.digest && !n.breaking) { S.notifs.unshift(Object.assign({ id: Date.now() + Math.random(), time: Date.now(), read: true }, n)); persist(); return; }
  if (inQuiet() && !demo && !(n.breaking && s.qBreak !== false)) { S.notifs.unshift(Object.assign({ id: Date.now() + Math.random(), time: Date.now(), read: false }, n)); persist(); return; }
  AL.pushNotif(n);
};
AL.hooks.onNew = p => AL.notify(p);
AL.hooks.onNewOpinion = o => { if (S.follows.authors.includes(o.author)) AL.notify(Object.assign({}, o, { cat: 'مقال جديد · ' + o.author, breaking: false }), true); };
AL.hooks.purge = gone => { S.notifs = S.notifs.filter(n => !n.postId || !gone.has(n.postId)); persist(); };
AL.testNotif = () => { if (!S.settings.notif) { toast('فعّل الإشعارات أولاً'); return; } const p = S.posts[Math.floor(Math.random() * Math.min(S.posts.length, 8))]; if (p) AL.notify(Object.assign({}, p, { breaking: false }), true); };
AL.testBreaking = () => { if (!S.settings.notif) { toast('فعّل الإشعارات أولاً'); return; } const p = S.posts[0]; if (p) AL.notify(Object.assign({}, p, { breaking: true }), true); };

/* ---- digest ---- */
AL.sendDigest = () => { const top = AL.digestTop(); if (!top.length) return; AL.pushNotif({ digest: true, title: 'أهم ' + AR(top.length) + ' أخبار اليوم: ' + top[0].title, cat: 'الملخص اليومي' }, { ms: 6000 }); };
AL.digestSheet = () => { const top = AL.digestTop(); AL.openModal(`<div class="m-box light"><button class="m-x" aria-label="إغلاق"><span class="material-symbols-rounded">close</span></button><h2>الملخص اليومي</h2><div class="dim sm">أهم أخبار اليوم</div>${top.map((p, i) => `<a class="mr" href="${link(p)}" data-link><b>${AR(i + 1)}</b><div>${esc(p.title)}</div></a>`).join('')}</div>`); };
setInterval(() => {
  const s = S.settings; if (!s.digest || !s.notif) return; const d = new Date(); if (d.getHours() !== s.digestHour) return;
  const key = d.toDateString(); if (store.get('ald_digest_last', '') === key) return; store.set('ald_digest_last', key); AL.sendDigest();
}, 60000);

/* ---- permission ---- */
AL.askPermission = async () => {
  if (!('Notification' in window)) { toast('المتصفح لا يدعم إشعارات النظام'); return false; }
  try { const r = await Notification.requestPermission(); if (r === 'granted') { toast('تم تفعيل إشعارات المتصفح'); return true; } toast('لم يُمنح إذن الإشعارات'); } catch (e) {}
  return false;
};

/* ---- page ---- */
AL.routes.push(['/notifications', el => {
  AL.setMeta('التنبيهات', 'آخر التنبيهات');
  const off = !S.settings.notif, noPerm = !('Notification' in window) ? false : Notification.permission !== 'granted';
  const L = S.notifs;
  el.innerHTML = `<div class="pg"><div class="pt-r"><h1 class="pt">التنبيهات</h1>${L.some(n => !n.read) ? '<button class="btn ghost" data-readall>تحديد الكل كمقروء</button>' : ''}</div>
  ${off ? '<div class="warn"><span class="material-symbols-rounded">notifications_off</span><div>الإشعارات متوقفة</div><button class="btn" data-notifon>تفعيل</button></div>' : (noPerm ? '<div class="warn"><span class="material-symbols-rounded">notifications</span><div>فعّل إشعارات المتصفح لتصلك التنبيهات والموقع مغلق</div><button class="btn" data-perm>تفعيل</button></div>' : '')}
  ${L.length ? `<div class="list">${L.map((n, i) => `<button class="nt ${n.read ? '' : 'un'}" data-nt="${i}"><span class="material-symbols-rounded ${n.breaking ? 'brk' : ''}">${n.breaking ? 'bolt' : n.digest ? 'today' : n.prayer ? 'mosque' : 'newspaper'}</span><div><b>${esc(n.title)}</b><div class="dim sm">${esc(n.cat || '')} · ${esc(ago(n.time))}</div></div>${n.read ? '' : '<i class="dot"></i>'}</button>`).join('')}</div>` : '<p class="empty"><span class="material-symbols-rounded big">notifications</span><br>لا توجد تنبيهات</p>'}</div>`;
}]);
document.addEventListener('click', e => {
  const t = e.target.closest('[data-readall],[data-notifon],[data-perm],[data-nt],[data-bnx],[data-bnspeak],[data-digest]'); if (!t) return; const D = t.dataset;
  if (D.readall !== undefined) { S.notifs.forEach(n => n.read = true); persist(); AL.route(); }
  else if (D.notifon !== undefined) { AL.setS({ notif: true }); AL.askPermission().then(() => AL.route()); }
  else if (D.perm !== undefined) AL.askPermission().then(() => AL.route());
  else if (D.nt !== undefined) { const n = S.notifs[+D.nt]; if (!n) return; n.read = true; persist(); if (n.digest) AL.digestSheet(); else if (n.postId) go('/news/' + n.postId); else AL.route(); }
  else if (D.bnspeak !== undefined) AL.speak(D.bnspeak);
  else if (D.digest !== undefined) { e.preventDefault(); e.stopPropagation(); const b = $('#banner'); b && (b.className = ''); AL.digestSheet(); }
  else if (D.bnx !== undefined) { const b = $('#banner'); b && (b.className = ''); }
}, true);
})();
