/* ══════════════════════════════════════════════════════════
   AU_ / JOURNAL — data layer
   All Supabase queries live here. Public pages, dashboard and
   admin all go through this module.
   Load order: supabase-config.js → supabase-client.js → journal-ui.js → journal-api.js
══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const POST_SELECT = `
    id, title, subtitle, slug, excerpt, cover_image_url, cover_image_alt,
    post_type, status, featured, published_at, created_at, updated_at,
    reading_time, view_count, like_count, comment_count, bookmark_count,
    related_project, series_id, category_id, seo_title, seo_description,
    categories ( name, slug ),
    series ( title, slug ),
    profiles ( username, display_name, avatar_url, verified, bio, role, github_url, linkedin_url, website )
  `;

  const API = {};

  function sb() { return window.getSupabase ? window.getSupabase() : null; }
  function guard() {
    if (!sb()) {
      API.lastError = 'Journal backend not connected. See js/supabase-config.js';
      return false;
    }
    return true;
  }
  function fail(e) {
    API.lastError = e && e.message ? e.message : String(e);
    console.warn('[AU Journal]', API.lastError);
    return null;
  }

  /* ── POSTS: public reads ───────────────────────────────────── */

  API.featuredPost = async function () {
    if (!guard()) return null;
    const { data, error } = await sb().from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(1);
    if (error) return fail(error);
    return (data && data[0]) || null;
  };

  API.latestPosts = async function (limit, offset, categorySlug) {
    if (!guard()) return [];
    let q = sb().from('posts').select(POST_SELECT)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset || 0, (offset || 0) + (limit || 9) - 1);
    if (categorySlug) {
      const { data: cat } = await sb().from('categories').select('id').eq('slug', categorySlug).maybeSingle();
      if (cat) q = q.eq('category_id', cat.id);
    }
    const { data, error } = await q;
    if (error) return fail(error) || [];
    return data || [];
  };

  API.trendingPosts = async function (limit) {
    if (!guard()) return [];
    const { data, error } = await sb().rpc('get_trending_posts', { p_limit: limit || 6 });
    if (error) return fail(error) || [];
    return data || [];
  };

  API.postsByCategory = async function (slug, limit, offset) {
    if (!guard()) return [];
    const { data: cat } = await sb().from('categories').select('id').eq('slug', slug).maybeSingle();
    if (!cat) return [];
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .eq('status', 'published').eq('category_id', cat.id)
      .order('published_at', { ascending: false })
      .range(offset || 0, (offset || 0) + (limit || 12) - 1);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.postsByType = async function (postType, limit) {
    if (!guard()) return [];
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .eq('status', 'published').eq('post_type', postType)
      .order('published_at', { ascending: false }).limit(limit || 6);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.postsByAuthor = async function (username, limit) {
    if (!guard()) return [];
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .eq('status', 'published')
      .eq('profiles.username', username)
      .order('published_at', { ascending: false }).limit(limit || 50);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.postsByTag = async function (tagSlug, limit) {
    if (!guard()) return [];
    const { data: tag } = await sb().from('tags').select('id').eq('slug', tagSlug).maybeSingle();
    if (!tag) return [];
    const { data: links, error } = await sb().from('post_tags').select('post_id').eq('tag_id', tag.id).limit(limit || 24);
    if (error) return fail(error) || [];
    const ids = (links || []).map(l => l.post_id);
    if (!ids.length) return [];
    const { data, error: e2 } = await sb().from('posts').select(POST_SELECT)
      .eq('status', 'published').in('id', ids)
      .order('published_at', { ascending: false });
    if (e2) return fail(e2) || [];
    return data || [];
  };

  API.getPost = async function (slug) {
    if (!guard()) return null;
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error) return fail(error);
    return data || null;
  };

  API.getPostById = async function (id) {
    if (!guard()) return null;
    const { data, error } = await sb().from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
    if (error) return fail(error);
    return data || null;
  };

  API.relatedPosts = async function (post, limit) {
    if (!guard()) return [];
    const filters = [];
    if (post.category_id) filters.push(q => q.eq('category_id', post.category_id));
    if (post.author_id) filters.push(q => q.eq('author_id', post.author_id));
    let q = sb().from('posts').select(POST_SELECT)
      .eq('status', 'published').neq('id', post.id)
      .order('published_at', { ascending: false }).limit(limit || 3);
    if (post.category_id) q = q.eq('category_id', post.category_id);
    const { data, error } = await q;
    if (error) return fail(error) || [];
    if (data.length >= (limit || 3)) return data;
    // top up with same-author posts
    const extra = await sb().from('posts').select(POST_SELECT)
      .eq('status', 'published').neq('id', post.id)
      .eq('author_id', post.author_id)
      .order('published_at', { ascending: false }).limit(limit || 3);
    const merged = [...(data || [])];
    for (const p of (extra.data || [])) {
      if (merged.length >= (limit || 3)) break;
      if (!merged.find(m => m.id === p.id)) merged.push(p);
    }
    return merged;
  };

  API.projectPosts = async function (projectId, limit) {
    if (!guard()) return [];
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .eq('status', 'published').eq('related_project', projectId)
      .order('published_at', { ascending: false }).limit(limit || 6);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.seriesList = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('series').select('*').order('created_at', { ascending: false }).limit(12);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.getSeries = async function (slug) {
    if (!guard()) return null;
    const { data, error } = await sb().from('series').select('*').eq('slug', slug).maybeSingle();
    if (error) return fail(error);
    if (!data) return null;
    const { data: sp } = await sb().from('series_posts').select('position, post_id').eq('series_id', data.id).order('position');
    const ids = (sp || []).map(x => x.post_id);
    let posts = [];
    if (ids.length) {
      const { data: pd } = await sb().from('posts').select(POST_SELECT).in('id', ids).eq('status', 'published');
      posts = (sp || []).map(x => (pd || []).find(p => p.id === x.post_id)).filter(Boolean);
    }
    return { series: data, posts };
  };

  API.categories = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('categories').select('*').order('name');
    if (error) return fail(error) || [];
    return data || [];
  };

  API.tags = async function (limit) {
    if (!guard()) return [];
    const { data, error } = await sb().from('tags').select('*').order('name').limit(limit || 40);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.profileByUsername = async function (username) {
    if (!guard()) return null;
    const { data, error } = await sb().from('profiles').select('*').eq('username', username).maybeSingle();
    if (error) return fail(error);
    return data || null;
  };

  API.profileById = async function (id) {
    if (!guard()) return null;
    const { data, error } = await sb().from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) return fail(error);
    return data || null;
  };

  API.authorStats = async function (authorId) {
    if (!guard()) return { posts: 0, followers: 0 };
    const [{ count: pc }, { count: fc }] = await Promise.all([
      sb().from('posts').select('id', { count: 'exact', head: true }).eq('author_id', authorId).eq('status', 'published'),
      sb().from('follows').select('*', { count: 'exact', head: true }).eq('following_id', authorId),
    ]);
    return { posts: pc || 0, followers: fc || 0 };
  };

  /* ── SEARCH ────────────────────────────────────────────────── */

  API.search = async function (opts) {
    if (!guard()) return { posts: [], authors: [], tags: [] };
    const o = opts || {};
    const { data, error } = await sb().rpc('search_journal', {
      q: o.q || '',
      p_category: o.category || null,
      p_type: o.type || null,
      p_author: o.author || null,
      p_sort: o.sort || 'relevance',
      p_limit: o.limit || 20,
      p_offset: o.offset || 0,
    });
    if (error) return fail(error) || { posts: [], authors: [], tags: [] };
    const posts = data || [];
    // side results: authors + tags matching q
    let authors = [], tags = [];
    if (o.q) {
      const like = '%' + o.q + '%';
      const [a, t] = await Promise.all([
        sb().from('profiles').select('username, display_name, avatar_url, bio, verified, role')
          .or('display_name.ilike.' + like + ',username.ilike.' + like).limit(6),
        sb().from('tags').select('name, slug').or('name.ilike.' + like + ',slug.ilike.' + like).limit(10),
      ]);
      authors = a.data || []; tags = t.data || [];
    }
    return { posts, authors, tags };
  };

  /* ── INTERACTIONS ──────────────────────────────────────────── */

  API.toggleLike = async function (postId, on) {
    if (!guard()) return false;
    if (on) {
      const { error } = await sb().from('likes').insert({ post_id: postId });
      if (error) return fail(error), false;
    } else {
      const { error } = await sb().from('likes').delete().eq('post_id', postId);
      if (error) return fail(error), false;
    }
    return true;
  };

  API.toggleBookmark = async function (postId, on) {
    if (!guard()) return false;
    if (on) {
      const { error } = await sb().from('bookmarks').insert({ post_id: postId });
      if (error) return fail(error), false;
    } else {
      const { error } = await sb().from('bookmarks').delete().eq('post_id', postId);
      if (error) return fail(error), false;
    }
    return true;
  };

  API.myLikeState = async function (postId) {
    if (!guard()) return { liked: false, bookmarked: false };
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return { liked: false, bookmarked: false };
    const [l, b] = await Promise.all([
      sb().from('likes').select('post_id').eq('user_id', uid).eq('post_id', postId).maybeSingle(),
      sb().from('bookmarks').select('post_id').eq('user_id', uid).eq('post_id', postId).maybeSingle(),
    ]);
    return { liked: !!l.data, bookmarked: !!b.data };
  };

  API.comments = async function (postId) {
    if (!guard()) return [];
    const { data, error } = await sb().from('comments')
      .select('id, post_id, user_id, parent_id, body, status, created_at, profiles ( username, display_name, avatar_url, verified )')
      .eq('post_id', postId).eq('status', 'visible')
      .order('created_at', { ascending: true });
    if (error) return fail(error) || [];
    return data || [];
  };

  API.addComment = async function (postId, body, parentId) {
    if (!guard()) return null;
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) { API.lastError = 'Sign in to comment.'; return null; }
    const { data, error } = await sb().from('comments')
      .insert({ post_id: postId, user_id: uid, body, parent_id: parentId || null, status: 'visible' })
      .select('id')
      .single();
    if (error) return fail(error);
    return data;
  };

  API.toggleFollow = async function (targetId, on) {
    if (!guard()) return false;
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return false;
    if (on) {
      const { error } = await sb().from('follows').insert({ follower_id: uid, following_id: targetId });
      if (error) return fail(error), false;
    } else {
      const { error } = await sb().from('follows').delete().eq('follower_id', uid).eq('following_id', targetId);
      if (error) return fail(error), false;
    }
    return true;
  };

  API.isFollowing = async function (targetId) {
    if (!guard()) return false;
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return false;
    const { data } = await sb().from('follows')
      .select('follower_id').eq('follower_id', uid).eq('following_id', targetId).maybeSingle();
    return !!data;
  };

  API.recordView = async function (postId) {
    if (!guard()) return;
    const uid = (await window.AUAuth.getUser())?.id || null;
    await sb().from('post_views').insert({ post_id: postId, viewer_id: uid });
  };

  API.saveProgress = async function (postId, progress) {
    if (!guard()) return;
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return; // reading history is per-user only
    await sb().from('reading_history').upsert(
      { user_id: uid, post_id: postId, progress, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,post_id' }
    );
  };

  API.getProgress = async function (postId) {
    if (!guard()) return 0;
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return 0;
    const { data } = await sb().from('reading_history')
      .select('progress').eq('user_id', uid).eq('post_id', postId).maybeSingle();
    return data ? Number(data.progress) : 0;
  };

  /* ── DASHBOARD (own data) ──────────────────────────────────── */

  API.myPosts = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .order('updated_at', { ascending: false }).limit(200);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.getMyPost = async function (id) {
    if (!guard()) return null;
    const { data, error } = await sb().from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
    if (error) return fail(error);
    return data;
  };

  API.savePost = async function (payload, id) {
    if (!guard()) return null;
    if (id) {
      const { data, error } = await sb().from('posts').update(payload).eq('id', id).select('id, slug, status').single();
      if (error) return fail(error);
      return data;
    }
    const { data, error } = await sb().from('posts').insert(payload).select('id, slug, status').single();
    if (error) return fail(error);
    return data;
  };

  API.setPostStatus = async function (id, status) {
    if (!guard()) return false;
    const { error } = await sb().from('posts').update({ status }).eq('id', id);
    if (error) return fail(error), false;
    return true;
  };

  API.deletePost = async function (id) {
    if (!guard()) return false;
    const { error } = await sb().from('posts').delete().eq('id', id);
    if (error) return fail(error), false;
    return true;
  };

  API.setTags = async function (postId, tagNames) {
    if (!guard()) return false;
    const names = [...new Set((tagNames || []).map(t => String(t).trim()).filter(Boolean))].slice(0, 8);
    if (names.length) {
      const rows = names.map(n => ({ name: n, slug: window.UI.slugify(n) }));
      const { error } = await sb().from('tags').upsert(rows, { onConflict: 'name' });
      if (error) return fail(error), false;
    }
    const { data: tagRows } = await sb().from('tags').select('id, name').in('name', names.length ? names : ['__none__']);
    await sb().from('post_tags').delete().eq('post_id', postId);
    if (tagRows && tagRows.length) {
      const { error } = await sb().from('post_tags').insert(tagRows.map(t => ({ post_id: postId, tag_id: t.id })));
      if (error) return fail(error), false;
    }
    return true;
  };

  API.getPostTags = async function (postId) {
    if (!guard()) return [];
    const { data, error } = await sb().from('post_tags').select('tags ( name, slug )').eq('post_id', postId);
    if (error) return fail(error) || [];
    return (data || []).map(x => x.tags).filter(Boolean);
  };

  API.setProjectLink = async function (postId, link) {
    if (!guard()) return false;
    await sb().from('project_links').delete().eq('post_id', postId);
    if (link && link.project_name) {
      const { error } = await sb().from('project_links').insert({
        post_id: postId,
        project_name: link.project_name,
        project_url: link.project_url || null,
        portfolio_project_id: link.portfolio_project_id || null,
      });
      if (error) return fail(error), false;
    }
    return true;
  };

  /* ── MEDIA (Supabase Storage) ──────────────────────────────── */

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

  API.uploadMedia = async function (file, onProgress) {
    if (!guard()) return null;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      API.lastError = 'Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.';
      return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      API.lastError = 'Image too large (max 5 MB).';
      return null;
    }
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) { API.lastError = 'Sign in to upload media.'; return null; }
    const cfg = window.SUPABASE_CONFIG;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await sb().storage
      .from(cfg.storageBucket)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    if (error) return fail(error);
    const { data } = sb().storage.from(cfg.storageBucket).getPublicUrl(path);
    const publicUrl = data && data.publicUrl;
    // register in media table
    const { data: row, error: e2 } = await sb().from('media')
      .insert({ owner_id: uid, storage_path: path, public_url: publicUrl, alt_text: file.name })
      .select('id, public_url').single();
    if (e2) return fail(e2);
    if (onProgress) onProgress(100);
    return row;
  };

  API.myMedia = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('media').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.deleteMedia = async function (row) {
    if (!guard()) return false;
    const cfg = window.SUPABASE_CONFIG;
    const { error } = await sb().storage.from(cfg.storageBucket).remove([row.storage_path]);
    if (error) return fail(error), false;
    await sb().from('media').delete().eq('id', row.id);
    return true;
  };

  /* ── READER DATA ───────────────────────────────────────────── */

  API.myBookmarks = async function () {
    if (!guard()) return [];
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return [];
    const { data: bms } = await sb().from('bookmarks').select('post_id, created_at').eq('user_id', uid).order('created_at', { ascending: false });
    const ids = (bms || []).map(b => b.post_id);
    if (!ids.length) return [];
    const { data } = await sb().from('posts').select(POST_SELECT).in('id', ids);
    return data || [];
  };

  API.myLikedPosts = async function () {
    if (!guard()) return [];
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return [];
    const { data: likes } = await sb().from('likes').select('post_id, created_at').eq('user_id', uid).order('created_at', { ascending: false });
    const ids = (likes || []).map(b => b.post_id);
    if (!ids.length) return [];
    const { data } = await sb().from('posts').select(POST_SELECT).in('id', ids);
    return data || [];
  };

  API.myFollowing = async function () {
    if (!guard()) return [];
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return [];
    const { data } = await sb().from('follows').select('following_id').eq('follower_id', uid);
    const ids = (data || []).map(f => f.following_id);
    if (!ids.length) return [];
    const { data: profiles } = await sb().from('profiles').select('*').in('id', ids);
    return profiles || [];
  };

  API.myHistory = async function () {
    if (!guard()) return [];
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) return [];
    const { data } = await sb().from('reading_history')
      .select('post_id, progress, updated_at').eq('user_id', uid).order('updated_at', { ascending: false }).limit(20);
    const rows = data || [];
    if (!rows.length) return [];
    const ids = rows.map(r => r.post_id);
    const { data: posts } = await sb().from('posts').select(POST_SELECT).in('id', ids);
    return rows.map(r => {
      const post = (posts || []).find(p => p.id === r.post_id);
      return post ? Object.assign({ progress: r.progress }, post) : null;
    }).filter(Boolean);
  };

  API.myAnalytics = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().rpc('post_analytics', { p_limit: 100 });
    if (error) return fail(error) || [];
    return data || [];
  };

  /* ── ADMIN ─────────────────────────────────────────────────── */

  API.adminAnalytics = async function () {
    if (!guard()) return null;
    const { data, error } = await sb().rpc('admin_analytics');
    if (error) return fail(error);
    return data;
  };

  API.allPosts = async function (status) {
    if (!guard()) return [];
    let q = sb().from('posts').select(POST_SELECT).order('updated_at', { ascending: false }).limit(200);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return fail(error) || [];
    return data || [];
  };

  API.reviewQueue = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('posts').select(POST_SELECT)
      .in('status', ['submitted', 'review', 'approved']).order('updated_at', { ascending: true });
    if (error) return fail(error) || [];
    return data || [];
  };

  API.adminSetStatus = async function (postId, status) {
    if (!guard()) return false;
    const { error } = await sb().rpc('admin_set_post_status', { p_post: postId, p_status: status });
    if (error) return fail(error), false;
    return true;
  };

  API.adminToggleFeature = async function (post) {
    if (!guard()) return false;
    const { error } = await sb().from('posts').update({ featured: !post.featured }).eq('id', post.id);
    if (error) return fail(error), false;
    return true;
  };

  API.adminComments = async function (status) {
    if (!guard()) return [];
    let q = sb().from('comments')
      .select('id, body, status, created_at, post_id, profiles ( username, display_name ), posts ( title, slug )')
      .order('created_at', { ascending: false }).limit(200);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return fail(error) || [];
    return data || [];
  };

  API.adminSetCommentStatus = async function (commentId, status) {
    if (!guard()) return false;
    const { error } = await sb().rpc('admin_set_comment_status', { p_comment: commentId, p_status: status });
    if (error) return fail(error), false;
    return true;
  };

  API.adminUsers = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.adminSetUserRole = async function (userId, role) {
    if (!guard()) return false;
    const { error } = await sb().rpc('admin_set_user_role', { p_user: userId, p_role: role });
    if (error) return fail(error), false;
    return true;
  };

  API.adminSetVerified = async function (userId, verified) {
    if (!guard()) return false;
    const { error } = await sb().rpc('admin_set_verified', { p_user: userId, p_verified: verified });
    if (error) return fail(error), false;
    return true;
  };

  API.adminReports = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('reports')
      .select('id, reason, details, status, created_at, post_id, comment_id, profiles ( username, display_name )')
      .order('created_at', { ascending: false }).limit(200);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.adminResolveReport = async function (reportId, status) {
    if (!guard()) return false;
    const { error } = await sb().from('reports').update({ status }).eq('id', reportId);
    if (error) return fail(error), false;
    return true;
  };

  API.adminSaveCategory = async function (cat) {
    if (!guard()) return false;
    if (cat.id) {
      const { error } = await sb().from('categories').update({ name: cat.name, slug: cat.slug, description: cat.description }).eq('id', cat.id);
      if (error) return fail(error), false;
    } else {
      const { error } = await sb().from('categories').insert({ name: cat.name, slug: cat.slug, description: cat.description });
      if (error) return fail(error), false;
    }
    return true;
  };

  API.adminDeleteCategory = async function (id) {
    if (!guard()) return false;
    const { error } = await sb().from('categories').delete().eq('id', id);
    if (error) return fail(error), false;
    return true;
  };

  API.adminSaveSeries = async function (s) {
    if (!guard()) return false;
    if (s.id) {
      const { error } = await sb().from('series').update({ title: s.title, slug: s.slug, description: s.description, cover_image_url: s.cover_image_url }).eq('id', s.id);
      if (error) return fail(error), false;
    } else {
      const { error } = await sb().from('series').insert({ title: s.title, slug: s.slug, description: s.description, cover_image_url: s.cover_image_url });
      if (error) return fail(error), false;
    }
    return true;
  };

  API.adminTrafficTrend = async function (days) {
    if (!guard()) return [];
    const { data, error } = await sb().rpc('traffic_trend', { p_days: days || 14 });
    if (error) return fail(error) || [];
    return data || [];
  };

  API.adminNewsletter = async function () {
    if (!guard()) return [];
    const { data, error } = await sb().from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) return fail(error) || [];
    return data || [];
  };

  API.subscribeNewsletter = async function (email) {
    if (!guard()) return false;
    const { error } = await sb().from('newsletter_subscribers').insert({ email });
    if (error) {
      if (String(error.code) === '23505') { window.UI.toast('Already subscribed.'); return true; }
      return fail(error), false;
    }
    return true;
  };

  API.reportContent = async function (payload) {
    if (!guard()) return false;
    const uid = (await window.AUAuth.getUser())?.id;
    if (!uid) { API.lastError = 'Sign in to report.'; return false; }
    const { error } = await sb().from('reports').insert(Object.assign({ reporter_id: uid }, payload));
    if (error) return fail(error), false;
    return true;
  };

  window.API = API;
})();
