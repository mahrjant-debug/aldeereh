/* Service Worker: يخزّن واجهة الموقع ليعمل دون اتصال. البيانات تُخزَّن من التطبيق نفسه. */
const V = 'ald-v3', SHELL = ['/', '/index.html', '/css/site.css', '/js/data.js', '/js/parsers.js', '/js/core.js', '/js/notify.js', '/js/card.js', '/js/ads.js', '/js/services.js', '/js/settings.js', '/js/boot.js', '/assets/logo.png', '/assets/app-icon-192.png', '/manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(x => { const c = x.clone(); caches.open(V).then(k => k.put('/index.html', c)); return x; }).catch(() => caches.match('/index.html'))); return; }
  if (new URL(r.url).pathname.startsWith('/api/')) return;
  e.respondWith(caches.match(r).then(m => { const f = fetch(r).then(x => { if (x.ok) { const c = x.clone(); caches.open(V).then(k => k.put(r, c)); } return x; }).catch(() => m); return m || f; }));
});
