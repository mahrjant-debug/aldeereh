/* الإعلانات: شريط عائم، إعلان بملء الشاشة، وعدّ الظهور والنقرات */
(function () {
'use strict';
const { S, $, $$, esc, store, toast } = AL;
let ADLIST = ADS.slice(); const ratios = {};
const stats = () => store.get('ald_adstats', {});
function track(ad, kind) { const s = stats(); const k = ad.img; s[k] = s[k] || { t: ad.title || 'إعلان', i: 0, c: 0 }; s[k][kind]++; store.set('ald_adstats', s); }
AL.adStats = stats; AL.resetAdStats = () => store.set('ald_adstats', {});
function preload(list) {
  return Promise.all(list.map(ad => new Promise(res => { if (ratios[ad.img]) return res(ad); const i = new Image(); i.onload = () => { if (i.naturalWidth) { ratios[ad.img] = i.naturalWidth / i.naturalHeight; res(ad); } else res(null); }; i.onerror = () => res(null); i.src = ad.img; setTimeout(() => res(null), 8000); }))).then(r => r.filter(Boolean));
}
async function fetchAds() {
  if (!S.online) return;
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 10000);
    const r = await fetch(SITE + '/', { signal: c.signal }); clearTimeout(t); if (!r.ok) return;
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html'); const seen = new Set(); const ads = [];
    doc.querySelectorAll('a img').forEach(im => {
      const src = im.getAttribute('src') || ''; const a = im.closest('a'); let d = src; try { d = decodeURI(src); } catch (e) {}
      const meta = d + ' ' + (im.getAttribute('title') || '') + ' ' + (im.getAttribute('alt') || '') + ' ' + (a.getAttribute('title') || '');
      if (!/wp-content\/uploads/.test(src) || /unnamed\.png/.test(src) || seen.has(src)) return;
      if (!/scaled|بنر|بانر|banner|إعلان|اعلان|اعلانية|إعلانية/i.test(meta)) return;
      seen.add(src); ads.push({ img: src, link: a.getAttribute('href') || SITE, title: (im.getAttribute('title') || a.getAttribute('title') || 'إعلان').replace(/&gt;/g, '>') });
    });
    if (ads.length) { ADLIST = ads; await build(); }
  } catch (e) {}
}
let idx = 0, timer;
async function build() {
  let box = $('#adstrip'); if (!box) { box = document.createElement('div'); box.id = 'adstrip'; box.hidden = true; document.body.appendChild(box); }
  if (!ADLIST.length || S.settings.dataSaver) { box.hidden = true; return; }
  const ok = await preload(ADLIST); if (!ok.length) { box.hidden = true; return; } ADLIST = ok;
  box.hidden = false; idx = 0;
  box.innerHTML = `<div class="ad-win"><div class="ad-track" id="adt">${ADLIST.map((a, i) => `<a class="ad-s" href="${esc(a.link)}" target="_blank" rel="noopener sponsored" data-ad="${i}"><img src="${esc(a.img)}" alt="${esc(a.title)}"></a>`).join('')}</div><span class="ad-tag">إعلان</span></div><div class="dots" id="add">${ADLIST.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>`;
  fit(); track(ADLIST[0], 'i');
  clearInterval(timer);
  timer = setInterval(() => { if (!AL.motionOK() || ADLIST.length < 2 || box.hidden) return; show((idx + 1) % ADLIST.length); }, 4000);
}
function show(i) { idx = i; const t = $('#adt'); if (!t) return; t.style.transform = `translateX(${i * 100}%)`; $$('#add i').forEach((d, k) => d.classList.toggle('on', k === i)); track(ADLIST[i], 'i'); fit(); }
function fit() { const w = $('.ad-win'); if (!w) return; const r = ratios[ADLIST[idx] && ADLIST[idx].img] || 4; const h = Math.max(72, Math.min(128, w.clientWidth / r)); w.style.height = h + 'px'; }
window.addEventListener('resize', fit);
document.addEventListener('click', e => { const a = e.target.closest('[data-ad]'); if (a) track(ADLIST[+a.dataset.ad], 'c'); const s = e.target.closest('[data-inter]'); if (s) { track(ADLIST[+s.dataset.inter], 'c'); } if (e.target.closest('[data-skip]')) AL.closeModal(); });

/* إعلان بملء الشاشة: مرة واحدة في كل جلسة، بزر تخطّي بعد ٥ ثوانٍ */
function interstitial() {
  try { if (sessionStorage.getItem('ald_inter')) return; } catch (e) {}
  if (!ADLIST.length || S.settings.dataSaver || S.saver || !S.online) return;
  try { sessionStorage.setItem('ald_inter', '1'); } catch (e) {}
  const ad = ADLIST[0]; track(ad, 'i');
  AL.openModal(`<div class="inter"><span class="ad-tag">إعلان</span><a href="${esc(ad.link)}" target="_blank" rel="noopener sponsored" data-inter="0"><img src="${esc(ad.img)}" alt="${esc(ad.title)}"></a><button class="btn gl" id="skipb" data-skip disabled>تخطّي بعد ٥</button></div>`);
  let n = 5; const t = setInterval(() => { const b = $('#skipb'); if (!b) { clearInterval(t); return; } n--; if (n <= 0) { b.disabled = false; b.textContent = 'تخطّي'; clearInterval(t); } else b.textContent = 'تخطّي بعد ' + AR(n); }, 1000);
}
const AR = AL.AR;
AL.initAds = async () => { await build(); await fetchAds(); setTimeout(interstitial, 2200); setInterval(fetchAds, 15 * 60 * 1000); };
})();
