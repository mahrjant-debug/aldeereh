# أصداء الديرة — الموقع

موقع ويب متجاوب (جوال + حاسوب) يجلب الأخبار مباشرة من aldeereh.com عبر WordPress REST API.

- `index.html` الصفحة الأساسية (تطبيق صفحة واحدة بمسارات نظيفة مثل `/news/123`)
- `js/app.js` المنطق والصفحات · `js/parsers.js` تحليل بيانات WordPress · `js/data.js` بيانات احتياطية
- `css/site.css` التصميم · `assets/` الشعار والأيقونات
- `prototype/` النموذج الأصلي للتطبيق (للرجوع فقط)

## النشر (Cloudflare Pages)
بلا أمر بناء، المجلد الجذر `/`. لا يوجد `404.html`، لذلك يعيد Cloudflare `index.html` لكل مسار.
