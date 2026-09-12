// netlify/functions/journalRss.js
// Generates /blog/rss.xml from published journal posts (Supabase REST).
// Uses only the anon key — never a service key — and only reads published posts.

const SITE = process.env.SITE_URL || 'https://adityauniyal.vercel.app';

exports.handler = async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const esc = s => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  let items = '';
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const base = SUPABASE_URL.replace(/\/+$/, '');
      const url = base + '/rest/v1/posts?select=slug,title,excerpt,published_at,updated_at,cover_image_url,profiles(username,display_name)&status=eq.published&order=published_at.desc&limit=50';
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        },
      });
      if (res.ok) {
        const rows = await res.json();
        items = rows.map(r => {
          const link = SITE + '/blog/post/' + esc(r.slug) + '/';
          const author = (r.profiles && (r.profiles.display_name || r.profiles.username)) || 'AU_ Journal';
          return '    <item>\n' +
            '      <title>' + esc(r.title) + '</title>\n' +
            '      <link>' + link + '</link>\n' +
            '      <guid isPermaLink="true">' + link + '</guid>\n' +
            '      <description>' + esc(r.excerpt || '') + '</description>\n' +
            '      <dc:creator>' + esc(author) + '</dc:creator>\n' +
            (r.cover_image_url ? '      <enclosure url="' + esc(r.cover_image_url) + '" type="image/jpeg" length="0"/>\n' : '') +
            '      <pubDate>' + new Date(r.published_at || r.updated_at).toUTCString() + '</pubDate>\n' +
            '    </item>\n';
        }).join('');
      }
    } catch (err) {
      console.error('rss: supabase fetch failed', err.message);
    }
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    '    <title>AU_ Journal — Aditya Uniyal</title>\n' +
    '    <link>' + SITE + '/blog/</link>\n' +
    '    <atom:link href="' + SITE + '/blog/rss.xml" rel="self" type="application/rss+xml"/>\n' +
    '    <description>Ideas. Experiments. Things worth sharing. Build logs, tutorials and case studies by Aditya Uniyal and contributors.</description>\n' +
    '    <language>en-us</language>\n' +
    (items || '    <item><title>Journal launching soon</title><link>' + SITE + '/blog/</link><description>No posts published yet.</description></item>\n') +
    '  </channel>\n' +
    '</rss>';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    body: xml,
  };
};
