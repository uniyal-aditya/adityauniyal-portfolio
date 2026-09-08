/* ══════════════════════════════════════════════════════════
   AU_ — portfolio ↔ journal integration
   • index.html  → "From the Journal": 3 latest posts
   • work.html   → "Build journal": project-linked posts
   Graceful: if Supabase is not configured, sections stay
   exactly as shipped (no fake data, no broken layout).
══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const isWorkPage = document.getElementById('buildJournalSlots') != null;

  function revealNew() {
    window.UI.observeReveals();
  }

  /* ── homepage teaser ── */
  async function homeTeaser() {
    const slot = document.getElementById('journalTeaser');
    if (!slot) return;
    if (!window.SUPABASE_CONFIG.configured()) return;

    const posts = await window.API.latestPosts(3, 0);
    if (!posts.length) return;
    slot.innerHTML = posts.map((p, i) => window.UI.postRow(p, i + 1)).join('');
    revealNew();
  }

  /* ── work page: build journal ── */
  async function buildJournal() {
    const slots = document.getElementById('buildJournalSlots');
    if (!slots) return;
    const section = document.getElementById('build-journal');
    if (!window.SUPABASE_CONFIG.configured()) return;

    const owner = await window.API.profileByUsername(window.SUPABASE_CONFIG.ownerUsername);
    if (!owner) return;
    const posts = await window.API.postsByAuthor(owner.username, 24);
    if (!posts.length) return;

    // group project-linked posts under their project
    const byProject = {};
    posts.filter(p => p.related_project).forEach(p => {
      (byProject[p.related_project] = byProject[p.related_project] || []).push(p);
    });
    const entries = Object.entries(byProject);
    if (!entries.length) return;

    section.hidden = false;
    slots.innerHTML = entries.map(([project, list]) =>
      '<div style="margin-bottom:44px">' +
        '<div class="meta" style="margin-bottom:14px">' +
          '<span class="status-live" style="text-transform:none">' + window.UI.escapeHtml(project) + '</span>' +
          '<span class="dot-sep">·</span><span>' + list.length + ' article' + (list.length === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<div class="builder-strip">' +
          list.slice(0, 4).map((p, i) => window.UI.builderCell(p, i + 1)).join('') +
        '</div>' +
      '</div>').join('');
    revealNew();
  }

  async function boot() {
    await window.AUJournalReady;
    if (isWorkPage) await buildJournal();
    else await homeTeaser();
  }

  boot();
})();
