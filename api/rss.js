// Vercel serverless route: GET /api/rss.xml
// Generates the journal RSS feed from published posts (Supabase REST).
// Uses only the anon key — never a service key.
// /blog/rss.xml is rewritten to this route in vercel.json.

const SITE = process.env.SITE_URL || 'https://adityauniyal.vercel.app'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  const esc = (s) => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  let items = ''
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const base = SUPABASE_URL.replace(/\/+$/, '')
      const url =
        base + '/rest/v1/posts?select=slug,title,excerpt,published_at,updated_at,cover_image_url,profiles(username,display_name)' +
        '&status=eq.published&order=published_at.desc&limit=50'
      const r = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      })
      if (r.ok) {
        for (const row of await r.json()) {
          const link = SITE + '/blog/post/' + esc(row.slug)
          const author = (row.profiles && (row.profiles.display_name || row.profiles.username)) || 'AU_ Journal'
          items +=
            '    <item>\n' +
            '      <title>' + esc(row.title) + '</title>\n' +
            '      <link>' + link + '</link>\n' +
            '      <guid isPermaLink="true">' + link + '</guid>\n' +
            '      <description>' + esc(row.excerpt || '') + '</description>\n' +
            '      <dc:creator>' + esc(author) + '</dc:creator>\n' +
            (row.cover_image_url ? '      <enclosure url="' + esc(row.cover_image_url) + '" type="image/jpeg" length="0"/>\n' : '') +
            '      <pubDate>' + new Date(row.published_at || row.updated_at).toUTCString() + '</pubDate>\n' +
            '    </item>\n'
        }
      }
    } catch (err) {
      console.error('rss: supabase fetch failed', err.message)
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    '    <title>AU_ Journal — Aditya Uniyal</title>\n' +
    '    <link>' + SITE + '/blog</link>\n' +
    '    <atom:link href="' + SITE + '/blog/rss.xml" rel="self" type="application/rss+xml"/>\n' +
    '    <description>Ideas. Experiments. Things worth sharing. Build logs, tutorials and case studies by Aditya Uniyal and contributors.</description>\n' +
    '    <language>en-us</language>\n' +
    (items || '    <item><title>Journal launching soon</title><link>' + SITE + '/blog</link><description>No posts published yet.</description></item>\n') +
    '  </channel>\n' +
    '</rss>'

  res.status(200).send(xml)
}
