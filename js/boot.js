/* التشغيل: شاشة البداية، Service Worker، ثم بدء التطبيق */
(function () {
'use strict';
const sp = document.getElementById('splash');
let first = true; try { first = !sessionStorage.getItem('ald_splash'); sessionStorage.setItem('ald_splash', '1'); } catch (e) {}
if (sp) { if (first) setTimeout(() => { sp.classList.add('off'); setTimeout(() => sp.remove(), 600); }, 1900); else sp.remove(); }
AL.start().then(() => AL.initAds && AL.initAds());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
