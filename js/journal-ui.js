/* ══════════════════════════════════════════════════════════
   AU_ / JOURNAL — shared UI helpers
   Toasts, empty states, formatting, verified badges, auth UI.
══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const UI = {};

  /* ── toasts ── */
  function toastRegion() {
    let r = document.querySelector('.toast-region');
    if (!r) {
      r = document.createElement('div');
      r.className = 'toast-region';
      r.setAttribute('role', 'status');
      r.setAttribute('aria-live', 'polite');
      document.body.appendChild(r);
    }
    return r;
  }
  UI.toast = function (msg, isError) {
    const t = document.createElement('div');
    t.className = 'toast' + (isError ? ' error' : '');
    t.textContent = msg;
    toastRegion().appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3400);
    setTimeout(() => t.remove(), 3800);
  };
  UI.err = function (msg) { UI.toast(msg, true); };

  /* ── dates & numbers ── */
  UI.fmtDate = function (iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  UI.fmtNum = function (n) {
    if (n == null) return '0';
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };
  UI.timeAgo = function (iso) {
    if (!iso) return '—';
    const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return UI.fmtDate(iso);
  };
  UI.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };
  UI.typeLabel = function (t) {
    return String(t || 'article').replace('_', ' ');
  };

  /* ── avatar (img or initials fallback) ── */
  UI.avatar = function (profile, size) {
    size = size || 22;
    const name = (profile && (profile.display_name || profile.username)) || '?';
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    if (profile && profile.avatar_url) {
      return '<img src="' + UI.escapeHtml(profile.avatar_url) + '" alt="' + UI.escapeHtml(name) +
        '" width="' + size + '" height="' + size + '" loading="lazy" style="width:' + size + 'px;height:' + size + 'px">';
    }
    return '<span class="ac-fallback" style="width:' + size + 'px;height:' + size + 'px">' + UI.escapeHtml(initial) + '</span>';
  };

  /* ── verified badge ── */
  UI.verifiedBadge = function (profile) {
    if (!profile || !profile.verified) return '';
    return ' <span class="badge-verified" title="Verified author" aria-label="Verified author">✓</span>';
  };

  /* ── cover media for cards ── */
  UI.coverMedia = function (post, fallbackClass) {
    if (post.cover_image_url) {
      return '<img src="' + UI.escapeHtml(post.cover_image_url) + '" alt="' +
        UI.escapeHtml(post.cover_image_alt || post.title) + '" loading="lazy">';
    }
    return '<div class="fm-fallback ' + (fallbackClass || '') + '">AU_</div>';
  };

  /* ── category / type chips ── */
  UI.catChip = function (name, slug) {
    if (!name) return '';
    return '<a class="cat-chip" href="/blog/topic/' + UI.escapeHtml(slug || '') + '/">' + UI.escapeHtml(name) + '</a>';
  };
  UI.typeChip = function (type) {
    return '<span class="type-chip">' + UI.escapeHtml(UI.typeLabel(type)) + '</span>';
  };

  /* ── author chip ── */
  UI.authorChip = function (post) {
    const p = post.profiles || post.author || {};
    const name = p.display_name || p.username || 'Unknown';
    return '<a class="author-chip" href="/blog/author/' + UI.escapeHtml(p.username || '') + '/">' +
      UI.avatar(p, 22) +
      '<span>' + UI.escapeHtml(name) + '</span>' +
      UI.verifiedBadge(p) + '</a>';
  };

  /* ── post card (grid) ── */
  UI.postCard = function (post) {
    const p = post.profiles || post.author || {};
    const cat = post.categories || {};
    return (
      '<article class="post-card reveal">' +
        '<a class="pc-media" href="/blog/post/' + UI.escapeHtml(post.slug) + '/" aria-hidden="true" tabindex="-1">' +
          UI.coverMedia(post) + '</a>' +
        '<div class="pc-body">' +
          '<div class="meta">' + UI.catChip(cat.name, cat.slug) + UI.typeChip(post.post_type) + '</div>' +
          '<h3><a href="/blog/post/' + UI.escapeHtml(post.slug) + '/">' + UI.escapeHtml(post.title) + '</a></h3>' +
          '<div class="pc-excerpt">' + UI.escapeHtml(post.excerpt || '') + '</div>' +
          '<div class="pc-foot meta">' +
            UI.authorChip(post) +
            '<span class="dot-sep">·</span><span>' + UI.fmtDate(post.published_at || post.created_at) + '</span>' +
            '<span class="dot-sep">·</span><span>' + (post.reading_time || 1) + ' min</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  };

  /* ── editorial list row ── */
  UI.postRow = function (post, num) {
    const p = post.profiles || post.author || {};
    const cat = post.categories || {};
    return (
      '<article class="post-row reveal">' +
        '<div class="pr-num">' + String(num == null ? '—' : num).padStart(2, '0') + '</div>' +
        '<div>' +
          '<div class="meta" style="margin-bottom:8px">' + UI.catChip(cat.name, cat.slug) + UI.typeChip(post.post_type) + '</div>' +
          '<h3><a href="/blog/post/' + UI.escapeHtml(post.slug) + '/">' + UI.escapeHtml(post.title) + '</a></h3>' +
          '<div class="pr-desc">' + UI.escapeHtml(post.excerpt || '') + '</div>' +
          '<div class="meta" style="margin-top:10px">' + UI.authorChip(post) +
            '<span class="dot-sep">·</span><span>' + UI.fmtDate(post.published_at || post.created_at) + '</span>' +
            '<span class="dot-sep">·</span><span>' + (post.reading_time || 1) + ' min read</span></div>' +
        '</div>' +
        '<div class="pr-side meta">' +
          '<span>' + UI.fmtNum(post.view_count) + ' views</span>' +
          '<span>' + UI.fmtNum(post.like_count) + ' likes</span>' +
        '</div>' +
      '</article>'
    );
  };

  /* ── builder cell (project journal links) ── */
  UI.builderCell = function (post, num) {
    return (
      '<div class="builder-cell">' +
        '<div class="bc-num">' + String(num).padStart(2, '0') + '</div>' +
        '<h4><a href="/blog/post/' + UI.escapeHtml(post.slug) + '/">' + UI.escapeHtml(post.title) + '</a></h4>' +
        '<div class="bc-meta meta"><span>' + UI.fmtDate(post.published_at) + '</span>' +
        '<span class="dot-sep">·</span><span>' + (post.reading_time || 1) + ' min</span></div>' +
      '</div>'
    );
  };

  /* ── writer card ── */
  UI.writerCard = function (profile, postCount) {
    const name = profile.display_name || profile.username;
    const role = (profile.role === 'owner' || profile.username === 'adityauniyal') ? 'OWNER' :
                 profile.role === 'verified_author' ? 'VERIFIED AUTHOR' :
                 profile.role === 'admin' ? 'EDITOR' :
                 profile.role === 'contributor' ? 'CONTRIBUTOR' : 'READER';
    return (
      '<a class="writer-card reveal" href="/blog/author/' + UI.escapeHtml(profile.username) + '/">' +
        UI.avatar(profile, 64) +
        '<h4>' + UI.escapeHtml(name) + UI.verifiedBadge(profile) + '</h4>' +
        '<div class="w-role">' + role + '</div>' +
        (profile.bio ? '<div class="w-bio">' + UI.escapeHtml(profile.bio) + '</div>' : '') +
        '<div class="meta"><span>' + (postCount == null ? '—' : postCount) + ' articles</span></div>' +
      '</a>'
    );
  };

  /* ── scroll reveals (self-contained; does not depend on main.js) ── */
  UI.observeReveals = function (root) {
    const els = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
    els.forEach(el => obs.observe(el));
  };

  /* ── empty state (never fake data) ── */
  UI.empty = function (title, note, compact) {
    return '<div class="empty-state' + (compact ? ' compact' : '') + '">' +
      '<div class="es-glyph">[ ]</div>' +
      '<div class="es-title">' + UI.escapeHtml(title || 'No data yet.') + '</div>' +
      (note ? '<div class="es-note">' + UI.escapeHtml(note) + '</div>' : '') +
    '</div>';
  };

  /* ── skeletons ── */
  UI.skeletons = function (n, cls) {
    let out = '';
    for (let i = 0; i < (n || 3); i++) out += '<div class="skeleton skel-card"></div>';
    return '<div class="post-grid ' + (cls || '') + '">' + out + '</div>';
  };

  /* ── copy helper ── */
  UI.copy = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      UI.toast('Copied to clipboard');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); UI.toast('Copied to clipboard'); }
      catch (e2) { UI.err('Copy failed'); }
      ta.remove();
    }
  };

  /* ── markdown-ish editor helpers (title→slug, reading time) ── */
  UI.slugify = function (s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  };
  UI.readingTime = function (markdown) {
    const words = String(markdown || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  };

  /* ── querystring ── */
  UI.qs = function (key) {
    return new URLSearchParams(window.location.search).get(key);
  };

  /* ── auth-aware nav area: fills #journalUser in the journal navbar ── */
  UI.renderNavUser = function (user, profile) {
    const slot = document.getElementById('journalUser');
    if (!slot) return;
    if (!user) {
      slot.innerHTML = '<a href="/blog/login/" class="btn-ghost-line" style="padding:9px 16px;font-size:11px">Sign in</a>';
      return;
    }
    const name = profile ? (profile.display_name || profile.username) : (user.email || 'you');
    const isAdmin = profile && (profile.role === 'admin' || profile.role === 'owner');
    slot.innerHTML =
      '<a href="/blog/dashboard/" class="journal-nav-user" title="Dashboard">' +
        UI.avatar(profile, 28) +
        '<span class="jn-name">' + UI.escapeHtml(name) + '</span>' +
      '</a>' +
      (isAdmin ? '<a href="/blog/admin/" class="jn-name" style="color:var(--lime)">ADMIN</a>' : '');
  };

  window.UI = UI;
})();
