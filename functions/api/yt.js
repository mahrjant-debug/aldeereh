// يجلب رابط الفيديو من صفحة الخبر الأصلية (الحقل غير متاح في واجهة ووردبريس)
export async function onRequestGet({ request }) {
  const id = new URL(request.url).searchParams.get('id') || '';
  const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' };
  if (!/^\d{1,9}$/.test(id)) return new Response('{"yt":null}', { status: 400, headers: H });
  try {
    const r = await fetch('https://www.aldeereh.com/' + id + '.html', { headers: { 'user-agent': 'Mozilla/5.0 (compatible; AldeerehApp/1.0)' }, cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!r.ok) return new Response('{"yt":null}', { headers: H });
    const html = await r.text();
    const zone = (html.match(/<span class="video_news">([\s\S]{0,900}?)<\/span>/) || [])[1] || '';
    const m = zone.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/) || zone.match(/youtu\.be\/([\w-]{11})/);
    return new Response(JSON.stringify({ yt: m ? m[1] : null }), { headers: H });
  } catch (e) { return new Response('{"yt":null}', { headers: H }); }
}
