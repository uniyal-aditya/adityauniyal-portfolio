/* ══════════════════════════════════════════════════════════
   AU_ / JOURNAL — article page controller (/blog/post/[slug]/)
══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  function slugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // /blog/post/<slug>/
    const i = parts.indexOf('post');
    if (i >= 0 && parts[i + 1]) return decodeURIComponent(parts[i + 1]);
    return decodeURIComponent(window.UI.qs('slug') || '');
  }

  function articleLd(post, profile) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt || post.subtitle || '',
      image: post.cover_image_url || undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { '@type': 'Person', name: profile.display_name || profile.username, url: location.origin + '/blog/author/' + profile.username + '/' },
      publisher: { '@type': 'Organization', name: 'AU_ Journal' },
      mainEntityOfPage: location.href,
    };
  }

  async function boot() {
    await window.AUJournalReady;
    const slug = slugFromPath();
    const main = $('articleMain');

    if (!window.SUPABASE_CONFIG.configured()) {
      main.innerHTML = '<div class="journal-top"><div class="container">' +
        window.UI.empty('Journal is not connected yet.', 'Backend keys are missing — see the README.') +
        '</div></div>';
      return;
    }
    if (!slug) {
      main.innerHTML = '<div class="journal-top"><div class="container">' +
        window.UI.empty('No article specified.', 'Pick a story from the journal index.') +
        '<div style="text-align:center; margin-top:24px"><a class="btn-ghost-line" href="/blog/">← Back to Journal</a></div>' +
        '</div></div>';
      return;
    }

    const post = await window.API.getPost(slug);
    if (!post) {
      main.innerHTML = '<div class="journal-top"><div class="container">' +
        window.UI.empty('Article not found.', 'It may be unpublished, or the link is wrong.') +
        '<div style="text-align:center; margin-top:24px"><a class="btn-ghost-line" href="/blog/">← Back to Journal</a></div>' +
        '</div></div>';
      document.title = 'Not found — AU_ Journal';
      return;
    }

    const profile = post.profiles || {};
    const cat = post.categories || {};
    const series = post.series || null;
    const canonical = location.origin + '/blog/post/' + post.slug + '/';

    // ── SEO ──
    document.title = (post.seo_title || post.title) + ' — AU_ Journal';
    const meta = (name, content, attr) => {
      const el = document.createElement('meta');
      el.setAttribute(attr || 'name', name);
      el.setAttribute('content', content || '');
      document.head.appendChild(el);
    };
    meta('description', post.seo_description || post.excerpt || post.title);
    document.querySelector('meta[name="robots"]').setAttribute('content', 'index, follow');
    meta('og:title', post.title, 'property');
    meta('og:description', post.excerpt || '', 'property');
    meta('og:type', 'article', 'property');
    meta('og:url', canonical, 'property');
    if (post.cover_image_url) meta('og:image', post.cover_image_url, 'property');
    meta('article:published_time', post.published_at || '', 'property');
    meta('article:modified_time', post.updated_at || '', 'property');
    meta('article:author', profile.display_name || profile.username, 'property');
    const link = (rel, href) => {
      const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.appendChild(l);
    };
    link('canonical', canonical);
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify(articleLd(post, profile));
    document.head.appendChild(ld);

    // ── render ──
    const tocItems = window.AUMD.toc(post.content || '');
    const seriesNavHtml = ''; // filled after series fetch below

    main.innerHTML =
      '<div class="article-hero">' +
        '<div class="container">' +
          '<div class="ah-meta meta">' +
            window.UI.catChip(cat.name, cat.slug) +
            window.UI.typeChip(post.post_type) +
          '</div>' +
          '<h1>' + window.UI.escapeHtml(post.title) + '</h1>' +
          (post.subtitle ? '<p class="ah-subtitle">' + window.UI.escapeHtml(post.subtitle) + '</p>' : '') +
          '<div class="meta">' +
            '<a class="author-chip" href="/blog/author/' + window.UI.escapeHtml(profile.username) + '/">' +
              window.UI.avatar(profile, 26) +
              '<span>' + window.UI.escapeHtml(profile.display_name || profile.username) + '</span>' +
              window.UI.verifiedBadge(profile) + '</a>' +
            '<span class="dot-sep">·</span><span>' + window.UI.fmtDate(post.published_at) + '</span>' +
            '<span class="dot-sep">·</span><span>' + (post.reading_time || 1) + ' min read</span>' +
            (post.updated_at && (new Date(post.updated_at) - new Date(post.published_at) > 864e5)
              ? '<span class="dot-sep">·</span><span>updated ' + window.UI.fmtDate(post.updated_at) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      (post.cover_image_url
        ? '<figure class="article-cover"><img src="' + window.UI.escapeHtml(post.cover_image_url) + '" alt="' +
            window.UI.escapeHtml(post.cover_image_alt || post.title) + '">' +
          (post.cover_image_alt ? '<figcaption class="ac-alt">' + window.UI.escapeHtml(post.cover_image_alt) + '</figcaption>' : '') +
          '</figure>'
        : '') +
      '<div class="article-layout container">' +
        '<aside class="toc" id="toc" aria-label="Table of contents">' +
          '<div class="toc-label">ON THIS PAGE</div>' +
          (tocItems.length
            ? tocItems.map(t => '<a class="lvl-' + t.level + '" href="#' + t.id + '">' + window.UI.escapeHtml(t.text) + '</a>').join('')
            : '<span class="es-note" style="color:var(--dim)">No headings</span>') +
        '</aside>' +
        '<div>' +
          '<article class="article-body" id="articleBody">' + window.AUMD.render(post.content || '') + '</article>' +
          '<div class="article-actions">' +
            '<button class="action-btn" id="btnLike" aria-pressed="false">♥ Like · <span id="likeCount">' + window.UI.fmtNum(post.like_count) + '</span></button>' +
            '<button class="action-btn" id="btnBookmark" aria-pressed="false">⌘ Bookmark · <span id="bookmarkCount">' + window.UI.fmtNum(post.bookmark_count) + '</span></button>' +
            '<button class="action-btn" id="btnCopy">⧉ Copy link</button>' +
            '<button class="action-btn" id="btnShare">↗ Share</button>' +
          '</div>' +
          '<div id="seriesNavSlot">' + seriesNavHtml + '</div>' +
          (post.related_project
            ? '<div class="related-project"><div class="rp-label">RELATED PROJECT</div>' +
              '<a href="/work.html#' + window.UI.escapeHtml(post.related_project) + '"><h4>' + window.UI.escapeHtml(post.related_project) + '</h4>' +
              '<p>Part of the builds catalogued on the portfolio →</p></a></div>'
            : '') +
          '<div class="author-card">' +
            '<a href="/blog/author/' + window.UI.escapeHtml(profile.username) + '/">' + window.UI.avatar(profile, 72) + '</a>' +
            '<div>' +
              '<h4><a href="/blog/author/' + window.UI.escapeHtml(profile.username) + '/">' + window.UI.escapeHtml(profile.display_name || profile.username) + '</a>' +
                window.UI.verifiedBadge(profile) + '</h4>' +
              (profile.bio ? '<div class="ac-bio">' + window.UI.escapeHtml(profile.bio) + '</div>' : '') +
              '<div class="ac-links">' +
                (profile.github_url ? '<a href="' + window.UI.escapeHtml(profile.github_url) + '" target="_blank" rel="noopener">GitHub ↗</a>' : '') +
                (profile.linkedin_url ? '<a href="' + window.UI.escapeHtml(profile.linkedin_url) + '" target="_blank" rel="noopener">LinkedIn ↗</a>' : '') +
                (profile.website ? '<a href="' + window.UI.escapeHtml(profile.website) + '" target="_blank" rel="noopener">Website ↗</a>' : '') +
                '<a href="/blog/author/' + window.UI.escapeHtml(profile.username) + '/">More articles →</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<nav class="pager-nav" id="pagerNav" aria-label="More articles"></nav>' +
        '</div>' +
      '</div>' +
      '<section class="jsection"><div class="comments-wrap">' +
        '<h2 style="font-family:var(--f-display); font-size:2.2rem; margin-bottom:24px;">Comments <span style="color:var(--dim)">( <span id="commentCount">' + window.UI.fmtNum(post.comment_count) + '</span> )</span></h2>' +
        '<div id="commentAuthArea"></div>' +
        '<div id="commentsList"></div>' +
      '</div></section>';

    // ── series nav ──
    if (post.series_id) {
      window.getSupabase().from('series').select('title, slug').eq('id', post.series_id).maybeSingle()
        .then(async ({ data: s }) => {
          if (!s) return;
          const { data: sp } = await window.getSupabase().from('series_posts')
            .select('position, post_id').eq('series_id', post.series_id).order('position');
          const ids = (sp || []).map(x => x.post_id);
          if (!ids.length) return;
          const { data: pd } = await window.getSupabase().from('posts')
            .select('id, title, slug, status').in('id', ids).eq('status', 'published');
          const ordered = (sp || []).map(x => (pd || []).find(p => p.id === x.post_id)).filter(Boolean);
          const html = '<div class="series-nav"><div class="sn-label">SERIES — ' + window.UI.escapeHtml(s.title) + '</div><ol>' +
            ordered.map(p => '<li class="' + (p.slug === post.slug ? 'current' : '') + '"><a href="/blog/post/' + window.UI.escapeHtml(p.slug) + '/">' + window.UI.escapeHtml(p.title) + '</a></li>').join('') +
            '</ol></div>';
          $('seriesNavSlot').innerHTML = html;
        });
    }

    // ── related / pager ──
    window.API.relatedPosts(post, 2).then(rel => {
      if (!rel.length) return;
      $('pagerNav').innerHTML = rel.map((r, i) =>
        '<a class="pager-card ' + (i === 1 ? 'next' : '') + '" href="/blog/post/' + window.UI.escapeHtml(r.slug) + '/">' +
        '<div class="pg-label">' + (i === 1 ? 'NEXT READ →' : '← READ NEXT') + '</div>' +
        '<h4>' + window.UI.escapeHtml(r.title) + '</h4></a>').join('');
    });

    // ── view tracking (fire and forget, no fake numbers) ──
    window.API.recordView(post.id).catch(() => {});
    window.API.getProgress(post.id).then(saved => {
      if (saved > 2 && saved < 100) window.UI.toast('Welcome back — you were ' + Math.round(saved) + '% through this article.');
    });

    // ── reading progress + save ──
    let progressTimer = null;
    function updateProgress() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      $('readingProgress').style.width = pct + '%';
      clearTimeout(progressTimer);
      progressTimer = setTimeout(() => window.API.saveProgress(post.id, Math.round(pct)), 800);
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    // ── TOC active state ──
    const tocLinks = Array.from(document.querySelectorAll('#toc a[href^="#"]'));
    if (tocLinks.length) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      document.querySelectorAll('.article-body h2[id], .article-body h3[id]').forEach(h => obs.observe(h));
      tocLinks.forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth' });
      }));
    }

    // ── like / bookmark / share ──
    const { user } = await window.AUAuth.getSession();
    async function refreshSocialState() {
      const st = await window.API.myLikeState(post.id);
      $('btnLike').classList.toggle('on', st.liked);
      $('btnLike').setAttribute('aria-pressed', String(st.liked));
      $('btnBookmark').classList.toggle('on', st.bookmarked);
      $('btnBookmark').setAttribute('aria-pressed', String(st.bookmarked));
    }
    if (user) refreshSocialState();

    $('btnLike').addEventListener('click', async () => {
      if (!(await window.AUAuth.getUser())) { window.UI.err('Sign in to like articles.'); return; }
      const on = !$('btnLike').classList.contains('on');
      if (await window.API.toggleLike(post.id, on)) {
        $('btnLike').classList.toggle('on', on);
        $('likeCount').textContent = window.UI.fmtNum(Math.max(0, post.like_count + (on ? 1 : 0)));
      } else window.UI.err(window.API.lastError || 'Could not update.');
    });
    $('btnBookmark').addEventListener('click', async () => {
      if (!(await window.AUAuth.getUser())) { window.UI.err('Sign in to bookmark.'); return; }
      const on = !$('btnBookmark').classList.contains('on');
      if (await window.API.toggleBookmark(post.id, on)) {
        $('btnBookmark').classList.toggle('on', on);
        $('bookmarkCount').textContent = window.UI.fmtNum(Math.max(0, post.bookmark_count + (on ? 1 : 0)));
      } else window.UI.err(window.API.lastError || 'Could not update.');
    });
    $('btnCopy').addEventListener('click', () => window.UI.copy(canonical));
    $('btnShare').addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: post.title, url: canonical }); } catch (e) { /* cancelled */ }
      } else window.UI.copy(canonical);
    });

    // ── comments ──
    function renderComments() {
      window.API.comments(post.id).then(list => {
        const byParent = {};
        list.forEach(c => {
          const key = c.parent_id || 'root';
          (byParent[key] = byParent[key] || []).push(c);
        });
        function node(c, depth) {
          const p = c.profiles || {};
          return '<div class="comment" data-id="' + c.id + '">' +
            '<div class="c-head">' + window.UI.avatar(p, 24) +
              '<a href="/blog/author/' + window.UI.escapeHtml(p.username || '') + '/" style="font-family:var(--f-mono); font-size:12px">' +
                window.UI.escapeHtml(p.display_name || p.username || 'user') + '</a>' +
              window.UI.verifiedBadge(p) +
              '<span class="meta">· ' + window.UI.timeAgo(c.created_at) + '</span></div>' +
            '<div class="c-body">' + window.UI.escapeHtml(c.body) + '</div>' +
            (depth < 3 ? '<div class="c-actions"><button data-reply="' + c.id + '">↩ Reply</button>' +
              '<button data-report="' + c.id + '">⚑ Report</button></div>' : '') +
            '</div>';
        }
        function tree(parentKey, depth) {
          return (byParent[parentKey] || []).map(c => node(c, depth) +
            '<div class="c-replies">' + tree(c.id, depth + 1) + '</div>').join('');
        }
        $('commentsList').innerHTML = list.length
          ? tree('root', 0)
          : window.UI.empty('No comments yet.', 'Start the conversation.');
        // wire reply + report
        $('commentsList').querySelectorAll('[data-reply]').forEach(b => b.addEventListener('click', () => {
          openComposer(b.getAttribute('data-reply'));
        }));
        $('commentsList').querySelectorAll('[data-report]').forEach(b => b.addEventListener('click', async () => {
          if (!(await window.AUAuth.getUser())) { window.UI.err('Sign in to report comments.'); return; }
          const ok = await window.API.reportContent({ comment_id: b.getAttribute('data-report'), reason: 'comment report' });
          if (ok) window.UI.toast('Report sent to moderators.');
          else window.UI.err(window.API.lastError || 'Report failed.');
        }));
      });
    }

    function openComposer(parentId) {
      let box = $('commentComposer');
      if (box) box.remove();
      const p = parentId ? byParentLabel(parentId) : null;
      const div = document.createElement('div');
      div.className = 'comment-form';
      div.id = 'commentComposer';
      div.style.margin = '18px 0';
      div.innerHTML =
        '<textarea id="commentText" placeholder="' + (parentId ? 'Reply…' : 'Add a comment…') + '" aria-label="Comment text"></textarea>' +
        '<div style="display:flex; gap:10px; margin-top:10px; justify-content:flex-end;">' +
        (parentId ? '<button class="mini-btn" id="commentCancel">Cancel</button>' : '') +
        '<button class="btn-lime" id="commentSend" style="font-size:11px; padding:10px 18px;">' + (parentId ? 'Reply →' : 'Post comment →') + '</button></div>';
      const anchor = parentId
        ? document.querySelector('.comment[data-id="' + parentId + '"]')
        : $('commentAuthArea');
      if (parentId && anchor) {
        anchor.insertAdjacentElement('afterend', div);
      } else {
        $('commentsList').before(div);
      }
      $('commentCancel')?.addEventListener('click', () => div.remove());
      $('commentSend').addEventListener('click', async () => {
        const text = $('commentText').value.trim();
        if (!text) { window.UI.err('Write something first.'); return; }
        const saved = await window.API.addComment(post.id, text, parentId || null);
        if (saved) {
          window.UI.toast(parentId ? 'Reply posted.' : 'Comment posted.');
          div.remove();
          renderComments();
        } else window.UI.err(window.API.lastError || 'Could not post comment.');
      });
    }
    function byParentLabel() { return null; }

    function renderAuthArea() {
      const area = $('commentAuthArea');
      if (!user) {
        area.innerHTML =
          '<div style="display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap;">' +
          '<a class="btn-lime" href="/blog/login/" style="font-size:11px; padding:10px 18px;">Sign in to comment →</a>' +
          '<span class="meta">comments are tied to your AU account</span></div>';
      } else {
        area.innerHTML = '<button class="btn-ghost-line" id="btnNewComment" style="font-size:11px; padding:10px 18px; margin-bottom:20px;">+ Write a comment</button>';
        $('btnNewComment').addEventListener('click', () => openComposer(null));
      }
    }
    renderAuthArea();
    renderComments();
  }

  boot();
})();
