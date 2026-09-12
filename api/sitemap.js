// Vercel serverless route: GET /api/sitemap.xml
// Generates the sitemap from published journal posts (Supabase REST).
// Uses only the anon key — never a service key — and only reads published posts.
// /blog/sitemap.xml is rewritten to this route in vercel.json.

const SITE = process.env.SITE_URL || 'https://adityauniyal.vercel.app'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')

  let body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url><loc>' + SITE + '/</loc></url>\n' +
    '  <url><loc>' + SITE + '/work</loc></url>\n' +
    '  <url><loc>' + SITE + '/about</loc></url>\n' +
    '  <url><loc>' + SITE + '/blog</loc></url>\n' +
    '  <url><loc>' + SITE + '/blog/search</loc></url>\n' +
    '  <url><loc>' + SITE + '/blog/series</loc></url>\n'

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const base = SUPABASE_URL.replace(/\/+$/, '')
      const r = await fetch(
        base + '/rest/v1/posts?select=slug,updated_at&status=eq.published&order=updated_at.desc&limit=1000',
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } },
      )
      if (r.ok) {
        for (const row of await r.json()) {
          body +=
            '  <url><loc>' + SITE + '/blog/post/' + esc(row.slug) + '</loc>' +
            (row.updated_at ? '<lastmod>' + new Date(row.updated_at).toISOString() + '</lastmod>' : '') +
            '</url>\n'
        }
      }
    } catch (err) {
      console.error('sitemap: supabase fetch failed', err.message)
    }
  }

  res.status(200).send(body + '</urlset>')
}
