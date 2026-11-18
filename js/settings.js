/* الإعدادات (لوحة التحكم) */
(function () {
'use strict';
const { S, $, $$, esc, store, toast, AR } = AL;
const tg = (k, label, desc, icon, dim) => `<div class="setrow ${dim ? 'dim40' : ''}"><span class="material-symbols-rounded si">${icon}</span><div style="flex:1"><div>${label}</div>${desc ? `<div class="dim sm">${desc}</div>` : ''}</div><button class="tg ${S.settings[k] ? 'on' : ''}" data-tg="${k}" role="switch" aria-checked="${!!S.settings[k]}" aria-label="${esc(label)}"><i></i></button></div>`;
const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(S.settings[k]) === String(v) ? 'on' : ''}" data-set="${k}:${v}">${l}</button>`).join('')}</div>`;
const grp = (title, body) => `<section class="sgrp"><h2>${title}</h2><div class="sbox">${body}</div></section>`;

AL.routes.push(['/settings', el => {
  AL.setMeta('الإعدادات', 'إعدادات القراءة والإشعارات');
  const s = S.settings, n = s.notif, perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const hrs = h => (h % 12 || 12) + (h >= 12 ? 'م' : 'ص');
  el.innerHTML = `<h1 class="pt">الإعدادات</h1>
  ${grp('المظهر والقراءة', `
    <div class="setcol"><div class="setrow0"><span>حجم الخط</span><b id="fsv">${AR(Math.round(s.fs * 100))}٪</b></div>
      <input type="range" id="fsr" min="85" max="145" step="5" value="${Math.round(s.fs * 100)}" aria-label="حجم الخط">
      <div class="acts" style="justify-content:flex-start"><button class="btn ghost" data-fsset="1">عادي</button><button class="btn ghost" data-fsset="1.2">كبير</button><button class="btn ghost" data-fsset="1.4">أكبر</button></div>
      <p class="body prev">هذه معاينة فورية لحجم الخط ونوعه عند قراءة الأخبار في أصداء الديرة.</p></div>
    <div class="setrow"><span class="material-symbols-rounded si">text_fields</span><div style="flex:1">خط المقال</div>${seg('af', [['naskh', 'نسخ'], ['sans', 'عصري']])}</div>
    ${tg('dark', 'الوضع الليلي', 'راحة للعين في الإضاءة المنخفضة', 'dark_mode')}
    ${tg('dataSaver', 'توفير البيانات', 'إخفاء الصور في الأخبار والإعلانات', 'data_saver_on')}`)}
  ${grp('الإشعارات والتنبيهات', `
    ${tg('notif', 'إشعارات الأخبار', 'تنبيهات داخل الصفحة، وإشعارات المتصفح عند منح الإذن', 'notifications')}
    ${perm !== 'unsupported' && perm !== 'granted' ? '<div class="setrow"><span class="material-symbols-rounded si">notifications_active</span><div style="flex:1">إشعارات المتصفح<div class="dim sm">لتصلك التنبيهات والصفحة في الخلفية</div></div><button class="btn ghost" data-perm>تفعيل</button></div>' : ''}
    ${tg('sound', 'التنبيه الصوتي', '', 'volume_up', !n)}${tg('vibrate', 'الاهتزاز', 'على الأجهزة التي تدعمه', 'vibration', !n)}
    ${tg('digest', 'الملخص اليومي', 'أهم 5 أخبار بدل كل خبر', 'today', !n)}
    ${s.digest ? `<div class="setrow"><span class="material-symbols-rounded si">schedule</span><div style="flex:1">وقت الملخص</div>${seg('digestHour', [[20, hrs(20)], [21, hrs(21)], [22, hrs(22)]])}</div>` : ''}
    ${tg('quiet', 'ساعات الهدوء', 'دون صوت أو بنر خلال الفترة', 'bedtime', !n)}
    ${s.quiet ? `<div class="setrow"><span class="material-symbols-rounded si">nights_stay</span><div style="flex:1">الفترة</div><div class="seg"><button class="${s.qFrom === 22 ? 'on' : ''}" data-qp="22:5">١٠م–٥ص</button><button class="${s.qFrom === 23 ? 'on' : ''}" data-qp="23:6">١١م–٦ص</button><button class="${s.qFrom === 0 ? 'on' : ''}" data-qp="0:7">١٢ص–٧ص</button></div></div>${tg('qBreak', 'السماح بالأخبار العاجلة', 'تصل العاجلة حتى في ساعات الهدوء', 'bolt', !n)}` : ''}
    ${tg('breakingOnly', 'العاجل فقط', '', 'emergency', !n)}${tg('obitNotif', 'إشعارات الوفيات', '', 'local_florist', !n)}
    <div class="setcol"><div>الأقسام التي تصلك إشعاراتها</div><div class="chipsw">${CATS.filter(c => c.n !== 'مقالات').map(c => `<button class="chipb ${s.notifCats.includes(c.n) ? 'on' : ''}" data-followcat="${esc(c.n)}">${esc(c.n)}</button>`).join('')}</div></div>
    <div class="setcol"><div class="acts" style="justify-content:flex-start"><button class="btn ghost" data-test="n">إشعار تجريبي</button><button class="btn ghost" data-test="b">إشعار عاجل تجريبي</button><button class="btn ghost" data-test="d">معاينة الملخص</button></div></div>`)}
  ${grp('القراءة الصوتية', `<div class="setrow"><span class="material-symbols-rounded si">speed</span><div style="flex:1">السرعة</div>${seg('ttsRate', [[0.8, 'أبطأ'], [1, 'عادية'], [1.25, 'أسرع']])}</div><div class="setcol"><button class="btn ghost" data-test="v">تجربة الصوت</button></div>`)}
  ${grp('الخدمات', `${tg('adhan', 'تنبيه الأذان', 'والصفحة مفتوحة', 'mosque')}<div class="setrow"><span class="material-symbols-rounded si">calculate</span><div style="flex:1">طريقة حساب الصلاة</div>${seg('pMethod', [[4, 'أم القرى'], [0, 'الجعفري']])}</div>`)}
  ${grp('للإدارة', `<a class="setrow" href="/stats" data-link><span class="material-symbols-rounded si">monitoring</span><div style="flex:1">إحصاءات الإعلانات والقراءة</div><span class="material-symbols-rounded">chevron_left</span></a>`)}
  ${grp('عام', `
    ${tg('autoRefresh', 'التحديث التلقائي', 'فحص الأخبار الجديدة تلقائياً', 'sync')}
    ${tg('batterySaver', 'توفير البطارية', 'تحديث أقل وإيقاف الحركة التلقائية' + (S.saverAuto ? ' · مفعّل تلقائياً لانخفاض الشحن أو توفير البيانات' : ''), 'battery_saver')}
    ${tg('offline', 'القراءة دون اتصال', 'حفظ آخر الأخبار تلقائياً على الجهاز', 'download_for_offline')}
    <div class="setcol"><div class="acts" style="justify-content:flex-start"><button class="btn ghost" data-clearsaved>مسح المحفوظات</button>${AL.canInstall() ? '<button class="btn" data-install>تثبيت التطبيق</button>' : ''}<button class="btn ghost" data-shareapp>شارك رابط التطبيق</button></div></div>
    <a class="setrow" href="https://wa.me/966594002003" target="_blank" rel="noopener"><span class="material-symbols-rounded si">chat</span><div style="flex:1">واتساب الصحيفة</div></a>
    <a class="setrow" href="https://t.me/aldeereh" target="_blank" rel="noopener"><span class="material-symbols-rounded si">send</span><div style="flex:1">تيليجرام</div></a>
    <a class="setrow" href="https://www.aldeereh.com" target="_blank" rel="noopener"><span class="material-symbols-rounded si">language</span><div style="flex:1">aldeereh.com</div></a>`)}
  <div class="dim sm" style="text-align:center;margin-top:16px">أصداء الديرة · الإصدار ٢٫٠</div>`;
}]);

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tg],[data-set],[data-qp],[data-test],[data-shareapp]'); if (!t) return; const D = t.dataset;
  if (D.tg) {
    const k = D.tg, v = !S.settings[k]; AL.setS({ [k]: v });
    if (k === 'notif' && v && 'Notification' in window && Notification.permission === 'default') AL.askPermission();
    if (k === 'offline' && !v) { ['ald_posts', 'ald_ops', 'ald_vids', 'ald_cache_t'].forEach(x => { try { localStorage.removeItem(x); } catch (e) {} }); }
    if (k === 'adhan') AL.scheduleAdhan();
    if (k === 'dataSaver' || k === 'batterySaver') AL.initAds && document.getElementById('adstrip') && (document.getElementById('adstrip').hidden = !!S.settings.dataSaver);
    AL.route();
  } else if (D.set) { const [k, v] = D.set.split(':'); AL.setS({ [k]: isNaN(+v) ? v : +v }); if (k === 'pMethod') { AL.scheduleAdhan(); } AL.route(); }
  else if (D.qp) { const [a, b] = D.qp.split(':').map(Number); AL.setS({ qFrom: a, qTo: b }); AL.route(); }
  else if (D.test) { const k = D.test; if (k === 'n') AL.testNotif(); else if (k === 'b') AL.testBreaking(); else if (k === 'd') AL.digestSheet(); else if (k === 'v') AL.speak('هذه تجربة للقراءة الصوتية في صحيفة أصداء الديرة'); }
  else if (D.shareapp !== undefined) AL.share({ title: 'أصداء الديرة', link: location.origin, text: 'تابع أخبار المنيزلة والأحساء على أصداء الديرة\n' + location.origin });
});
document.addEventListener('input', e => {
  if (e.target.id === 'fsr') { const v = +e.target.value / 100; AL.setS({ fs: v }); $('#fsv').textContent = AR(e.target.value) + '٪'; }
});
})();
