# Aditya Uniyal — Developer Portfolio + AU_ Journal

This repository contains a premium, responsive portfolio website for Aditya Uniyal, deployed on **Netlify**, with:

- The original portfolio (HTML/CSS/vanilla JS, terminal-editorial aesthetic)
- Serverless email feedback via SendGrid (Netlify Function)
- **AU_ / JOURNAL** — a full blog/publication platform backed by **Supabase** (PostgreSQL + Auth + Storage)

---

## Part 1 — Portfolio (original site)

- Multi-page static site (HTML/CSS/JS)
- Responsive (mobile + desktop)
- Feedback form posts to a Netlify Function → SendGrid email
- Social handles + Connect page

### Security & spam protection
- Serverless function performs basic validation.
- Consider adding reCAPTCHA or additional spam filters for production.

---

## Part 2 — AU_ / JOURNAL

A complete publication platform that lives under the same domain:

| Route | Page |
|---|---|
| `/blog/` | Journal homepage — featured, trending, latest, from-the-builder, writers, newsletter |
| `/blog/post/[slug]/` | Article page — TOC, reading progress, like/bookmark/share, comments, related |
| `/blog/author/[username]/` | Author profile — articles, followers, socials, verification |
| `/blog/topic/[slug]/` | Topic page — trending + latest in a category, tag cloud |
| `/blog/series/[slug]/` | Series — ordered chapters + reading progress |
| `/blog/search/` | Search across articles/authors/tags with sort + filters |
| `/blog/login/` | Sign in / sign up (email+password, magic link) |
| `/blog/dashboard/` | Reader + contributor dashboard |
| `/blog/dashboard/editor/` | Markdown article editor with cover upload, tags, series, SEO |
| `/blog/admin/` | Admin console — review queue, users, comments, reports, categories, analytics |
| `/blog/sitemap.xml` | Generated server-side from published posts |
| `/blog/rss.xml` | RSS feed generated server-side |

### Backend: Supabase

The Journal is powered entirely by Supabase client-side APIs (no custom server):

- **PostgreSQL** — posts, profiles, comments, likes, bookmarks, follows, media, series, categories, tags, reports, newsletter, reading history, raw view log
- **Auth** — email/password + magic link; profiles auto-created on signup via DB trigger
- **Storage** — `journal-media` bucket for cover/inline images

Only the **public anon key** is used in frontend code. Service-role keys never belong in this repo.

### Setup — 15 minutes

#### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project** (any region close to your users).
2. Note the **Project URL** and **anon public key** (Settings → API).

#### 2. Run the SQL migrations
Open **SQL Editor** in Supabase and run these three files **in order** (each is idempotent):

1. `supabase/01-schema.sql` — tables, enums, indexes, triggers, seed categories
2. `supabase/02-rls.sql` — Row Level Security policies + the `journal-media` storage bucket + storage policies
3. `supabase/03-rpc.sql` — RPC functions: search, trending, admin analytics, moderation actions

#### 3. Configure the frontend keys
Edit **`js/supabase-config.js`**:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your-anon-key...';
```

> ⚠️ Only the **anon** key goes here. It is safe to expose because RLS (step 2) restricts what it can do.
> Never place the service-role key, SendGrid key, or any server secret in frontend JavaScript.

#### 4. Claim the owner account
1. Visit `/blog/login/` → **Create account** using your admin email (or use a magic link).
2. In Supabase → SQL Editor, run:

```sql
update public.profiles
set role = 'owner', verified = true, username = 'adityauniyal'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
```

3. Sign in at `/blog/admin/` — the control room is now live.

#### 5. (Optional) Netlify environment variables
For the server-generated **sitemap** and **RSS**, set in Netlify → Site settings → Environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

(The existing `SENDGRID_API_KEY`, `TO_EMAIL`, `FROM_EMAIL` for the feedback function are unchanged.)

Also add your Supabase auth redirect: Supabase → Authentication → URL Configuration → add `https://adityauniyal.is-a.dev/blog/login/` to **Redirect URLs** (use `http://localhost:8888/blog/login/` for `netlify dev`).

### Contributor publishing flow

```
New contributor:  DRAFT → SUBMITTED → REVIEW → APPROVED → PUBLISHED
Verified authors: may publish directly (bypass review)
Admin:            approve · reject · request changes (reject) · hide · archive · feature
```

To promote someone: `/blog/admin/` → **Users** → change role / verify.

### Roles

| Role | Powers |
|---|---|
| `reader` | read published posts, comment, like, bookmark, follow |
| `contributor` | + own drafts, submit for review, own media library, own analytics |
| `verified_author` | + direct publishing |
| `admin` | + all moderation, users, categories, feature posts, site-wide analytics |
| `owner` | full control |

Role is enforced by **Row Level Security** on the server — the client cannot escalate.

### Content format

Articles are stored as **structured Markdown** (never raw HTML) and rendered through a
sanitizing renderer (`js/journal-md.js`): every string is HTML-escaped before formatting
is applied, so `<script>` injection is impossible. Supported: headings, bold/italic,
links, lists, blockquotes (with `— attribution`), fenced code blocks with language label,
inline code, images with captions, tables, horizontal rules, and auto-embeds for
**YouTube** (`youtube.com/watch`, `youtu.be`, ` Shorts`) and **GitHub repo** links.

### Security summary

- RLS is **mandatory** on every table; policies live in `supabase/02-rls.sql`
- Storage uploads restricted to the owner's own `journal-media/<uid>/` folder, image MIME types only, 5 MB cap (enforced client-side and by bucket policy)
- Profile role changes blocked client-side; only `admin_set_user_role` RPC (server-checked) can change roles
- Newsletter + view-log inserts are the only anon-writable tables
- Search/trending/moderation run through SQL functions that re-check role server-side

### Local development

```bash
npm install
npx netlify-cli dev     # serves site + functions on http://localhost:8888
```

Or any static server for the site alone (functions will be stubs):

```bash
npx serve .
```

---

## License

Personal portfolio use only.
