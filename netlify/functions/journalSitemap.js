// netlify/functions/journalSitemap.js
// Generates /blog/sitemap.xml from published journal posts (Supabase REST).
// Uses only the anon key — never a service key — and only reads published posts.

const SITE = 'https://adityauniyal.is-a.dev';

exports.handler = async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const staticUrls =
    '  <url><loc>' + SITE + '/</loc></url>\n' +
    '  <url><loc>' + SITE + '/work.html</loc></url>\n' +
    '  <url><loc>' + SITE + '/about.html</loc></url>\n' +
    '  <url><loc>' + SITE + '/blog/</loc></url>\n' +
    '  <url><loc>' + SITE + '/blog/search/</loc></url>\n';

  let postUrls = '';
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const base = SUPABASE_URL.replace(/\/+$/, '');
      const res = await fetch(base + '/rest/v1/posts?select=slug,updated_at&status=eq.published&order=updated_at.desc&limit=1000', {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        },
      });
      if (res.ok) {
        const rows = await res.json();
        postUrls = rows.map(r =>
          '  <url><loc>' + SITE + '/blog/post/' + esc(r.slug) + '/</loc>' +
          (r.updated_at ? '<lastmod>' + new Date(r.updated_at).toISOString() + '</lastmod>' : '') +
          '</url>\n').join('');
      }
    } catch (err) {
      console.error('sitemap: supabase fetch failed', err.message);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    body: xmlHeader + staticUrls + postUrls + '</urlset>',
  };
};
