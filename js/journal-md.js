/* ══════════════════════════════════════════════════════════
   AU_ / JOURNAL — Markdown renderer (safe, zero deps)
   ──────────────────────────────────────────────────────────
   • Renders a practical Markdown subset used by the editor.
   • NEVER stores or outputs raw HTML: input is escaped first,
     then formatting is applied structurally (XSS-safe).
   • Produces heading IDs for the table of contents.
   • Auto-embeds YouTube / GitHub / link cards.
   Load order: supabase-config.js → supabase-client.js → journal-ui.js → this
══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  /* Only http(s) URLs are ever linkified / embedded. */
  function safeUrl(u) {
    const s = String(u || '').trim();
    if (/^https:\/\//i.test(s)) return s;
    if (/^http:\/\//i.test(s)) return s; // allowed but flagged below
    return null;
  }

  /* ── inline: code, bold, italic, links ── */
  function inline(md) {
    let out = esc(md);
    // inline code first (protect from other rules)
    out = out.replace(/`([^`]+)`/g, (_, c) => '<code>' + c + '</code>');
    // images ![alt](url)
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, url, title) => {
      const u = safeUrl(url);
      if (!u) return m;
      return '<figure><img src="' + esc(u) + '" alt="' + esc(alt) + '" loading="lazy">' +
        (title ? '<figcaption>' + esc(title) + '</figcaption>' : '') + '</figure>';
    });
    // links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
      const u = safeUrl(url);
      if (!u) return text;
      const ext = /^https?:\/\/([a-z0-9.-]*\.)?(adityauniyal\.is-a\.dev)/i.test(u) ? '' : ' target="_blank" rel="noopener noreferrer"';
      return '<a href="' + esc(u) + '"' + ext + '>' + text + '</a>';
    });
    // autolink bare urls
    out = out.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, (m, pre, url) => {
      return pre + '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
    // bold / italic
    out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return out;
  }

  /* ── embed detection ── */
  function ytId(url) {
    const m = String(url).match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return m ? m[1] : null;
  }
  function githubRepo(url) {
    const m = String(url).match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?/i);
    return m ? { user: m[1], repo: m[2].replace(/\.git$/, '') } : null;
  }

  function embedHtml(url) {
    const u = safeUrl(url);
    if (!u) return null;
    const yt = ytId(u);
    if (yt) {
      return '<div class="embed-card"><div class="embed-video">' +
        '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(yt) + '" title="YouTube video" ' +
        'loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' +
        '</div></div>';
    }
    const gh = githubRepo(u);
    if (gh) {
      return '<a class="embed-card" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' +
        '<div class="ec-body">' +
        '<div class="ec-host">GITHUB REPO</div>' +
        '<div class="ec-title">' + esc(gh.user + ' / ' + gh.repo) + '</div>' +
        '<div class="ec-url">' + esc(u) + '</div>' +
        '</div></a>';
    }
    return null;
  }

  /* ── block parser ── */
  function render(md) {
    const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let listType = null; // 'ul' | 'ol'
    const closeList = () => { if (listType) { out.push('</' + listType + '>'); listType = null; } };

    while (i < lines.length) {
      const line = lines[i];

      // fenced code
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        closeList();
        const lang = fence[1] || '';
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // closing fence
        out.push('<pre>' + (lang ? '<span class="code-lang">' + esc(lang) + '</span>' : '') +
          '<code>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // blank
      if (!line.trim()) { closeList(); i++; continue; }

      // headings
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        closeList();
        const level = h[1].length;
        const text = h[2].trim();
        const id = 'h-' + text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
        out.push('<h' + level + ' id="' + id + '">' + inline(text) + '</h' + level + '>');
        i++;
        continue;
      }

      // hr
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { closeList(); out.push('<hr>'); i++; continue; }

      // blockquote (supports > lines, with optional — attribution)
      if (/^>\s?/.test(line)) {
        closeList();
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        let cite = '';
        const last = buf[buf.length - 1] || '';
        const cm = last.match(/^—\s*(.+)$/);
        if (cm) { cite = '<cite>' + esc(cm[1]) + '</cite>'; buf.pop(); }
        out.push('<blockquote>' + buf.map(inline).join('<br>') + cite + '</blockquote>');
        continue;
      }

      // tables: | a | b |  then  | --- | --- |
      if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        closeList();
        const header = line.trim().slice(1, -1).split('|').map(s => s.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().slice(1, -1).split('|').map(s => s.trim()));
          i++;
        }
        out.push('<table><thead><tr>' + header.map(c => '<th>' + inline(c) + '</th>').join('') +
          '</tr></thead><tbody>' +
          rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
          '</tbody></table>');
        continue;
      }

      // standalone media / embed lines
      const imgLine = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/);
      if (imgLine) {
        closeList();
        const u = safeUrl(imgLine[2]);
        if (u) {
          out.push('<figure><img src="' + esc(u) + '" alt="' + esc(imgLine[1]) + '" loading="lazy">' +
            (imgLine[3] ? '<figcaption>' + esc(imgLine[3]) + '</figcaption>' : '') + '</figure>');
        }
        i++;
        continue;
      }
      const bareUrl = line.match(/^(https?:\/\/\S+)\s*$/);
      if (bareUrl) {
        closeList();
        const emb = embedHtml(bareUrl[1]);
        out.push(emb || '<p><a href="' + esc(bareUrl[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(bareUrl[1]) + '</a></p>');
        i++;
        continue;
      }

      // lists
      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        const want = ul ? 'ul' : 'ol';
        if (listType !== want) { closeList(); listType = want; out.push('<' + want + '>'); }
        out.push('<li>' + inline((ul || ol)[1]) + '</li>');
        i++;
        continue;
      }

      // paragraph (merge consecutive lines)
      closeList();
      const buf = [line];
      i++;
      while (i < lines.length && lines[i].trim() &&
        !/^(#{1,4}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|\s*\|)/.test(lines[i]) &&
        !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
        !/^!\[[^\]]*\]\([^)]*\)\s*$/.test(lines[i]) &&
        !/^(https?:\/\/\S+)\s*$/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      out.push('<p>' + buf.map(inline).join('<br>') + '</p>');
    }
    closeList();
    return out.join('\n');
  }

  /* ── TOC extraction from rendered headings ── */
  function toc(md) {
    const items = [];
    const lines = String(md || '').split('\n');
    let inFence = false;
    for (const line of lines) {
      if (/^```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;
      const m = line.match(/^(#{2,3})\s+(.*)$/);
      if (m) {
        const text = m[2].trim();
        const id = 'h-' + text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
        items.push({ level: m[1].length, text, id });
      }
    }
    return items;
  }

  window.AUMD = { render, toc, safeUrl, embedHtml };
})();
