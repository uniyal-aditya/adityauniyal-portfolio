# Aditya Uniyal — Developer Portfolio + AU_ / JOURNAL

A responsive portfolio website with a full publication platform, deployed on **Vercel** ([adityauniyal.is-a.dev](https://adityauniyal.is-a.dev)).

- **Portfolio** — React 18 + TypeScript + Vite + Tailwind v4, terminal-editorial aesthetic
- **AU_ / JOURNAL** — publication platform backed by **Supabase** (PostgreSQL + Auth + Storage), Tiptap editor, contributor workflow, admin console
- **AU_ / BUILDING** — live GitHub activity, contribution heatmap, streaks (server-cached via a Vercel API route)
- Serverless routes in `api/`: GitHub proxy, sitemap.xml, rss.xml

---

## Part 1 — Portfolio

- React SPA (routes: `/`, `/work`, `/projects`, `/about`, `/skills`, `/connect`, `/feedback`, `/privacy`, plus `/terms`, `/data-use`, `/building`)
- Responsive (mobile + desktop), custom cursor, grain/scanline effects preserved from the original design
- **Contact and feedback forms send via [EmailJS](https://www.emailjs.com/)** (client-side; shared credentials module in `src/lib/emailjs.ts`, overridable with `VITE_EMAILJS_*` vars) with a hidden honeypot field for spam resistance
- GitHub activity on `/building` served through `api/github.js` with server-side caching; the `Authorization` header is only sent when `GITHUB_TOKEN` is configured

---

## Part 2 — AU_ / JOURNAL

A complete publication platform that lives under the same domain:

| Route | Page |
|---|---|
| `/blog/` | Journal homepage — featured, trending, latest, from-the-builder, writers, newsletter |
| `/blog/post/:slug` | Article page — TOC, reading progress, like/bookmark/share, comments, related |
| `/blog/author/:username` | Author profile — articles, followers/following, socials, verification |
| `/blog/topic/:slug` | Topic page — trending + latest in a category, tag cloud |
| `/blog/series/:slug` | Series — ordered chapters + reading progress |
| `/blog/search` | Search across articles/authors/tags with sort + filters |
| `/blog/login` · `/blog/signup` | Sign in / sign up (email+password, magic link, Google / GitHub / Discord OAuth) |
| `/blog/dashboard` | Reader + contributor dashboard (profile editing, bookmarks, history, notifications) |
| `/blog/dashboard/editor` | Tiptap editor with slash commands, cover upload, tags, series, related project, SEO |
| `/blog/admin` | Admin console — review queue, users, comments, reports, categories, tags, media, analytics, newsletter, settings |
| `/blog/apply` | Contributor application |
| `/blog/sitemap.xml` | Generated server-side from published posts |
| `/blog/rss.xml` | RSS feed generated server-side |

### Backend: Supabase

The Journal is powered entirely by Supabase client-side APIs (no custom server):

- **PostgreSQL** — posts, profiles, comments, likes, bookmarks, follows, media, series, categories, tags, reports, newsletter, reading history, raw view log, contributor applications, site settings, notifications
- **Auth** — email/password + magic link + Google / GitHub / Discord OAuth; profiles auto-created on signup via DB trigger
- **Storage** — `journal-media` bucket for cover/inline images

Only the **public anon key** is used in frontend code. Service-role keys never belong in this repo.

### Setup — 15 minutes

#### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project** (any region close to your users).
2. Note the **Project URL** and **anon public key** (Settings → API).

#### 2. Run the SQL migrations
Open **SQL Editor** in Supabase and run these files **in numeric order** (each is idempotent):

1. `supabase/01-schema.sql` — tables, enums, indexes, triggers, seed categories
2. `supabase/02-rls.sql` — Row Level Security policies + the `journal-media` storage bucket + storage policies
3. `supabase/03-rpc.sql` — RPC functions: search, trending, moderation actions ⚠️ *partially superseded by 05/08 — see the warning header in the file; never re-run it wholesale*
4. `supabase/04-applications.sql` — contributor applications table + RLS + review RPC
5. `supabase/05-follow-analytics.sql` … `10-site-settings.sql` — follow analytics, notifications, comment pinning, analytics fixes, profile fields, site settings
11. `supabase/11-private-emails.sql` — removes the public email column from profiles (emails live only in Supabase Auth)
12. `supabase/12-categorize-posts.sql` — one-off data fix: categories for the early posts
13. `supabase/13-post-metadata.sql` — one-off data fix: reading times, SEO fields, tags, related-project links
13b. `supabase/13b-post-metadata-finish.sql` — full backfill of the migration-13 data (run if 13 was interrupted)
13c. `supabase/13c-post-tags-project-links.sql` — finisher: `post_tags` + `project_links` rows only (idempotent, safe to re-run)
14. `supabase/14-guard-verified.sql` — only admins can change `verified`; DB-level guard on `posts.content` (blocks quote-bearing markdown image alt text)
15. `supabase/15-fix-search-path.sql` — pins `search_path` on functions and locks admin RPCs away from `anon` (Supabase security-advisor findings)
16. `supabase/16-invoker-trending-view.sql` — makes `trending_posts` a `security_invoker` view
17. `supabase/17-narrow-content-trigger.sql` — fires the `posts.content` guard only when `content` changes

#### 3. Configure the frontend keys
Copy `.env.example` to **`.env.local`** and fill it in:

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

> ⚠️ Only the **anon** key goes here. It is safe to expose because RLS (step 2) restricts what it can do.
> Never place the service-role key, SendGrid key, or any server secret in frontend JavaScript.
> `.env.local` is git-ignored; Vite only exposes variables prefixed with `VITE_`.

The EmailJS credentials have working fallbacks in `src/lib/emailjs.ts`; set `VITE_EMAILJS_SERVICE_ID` / `VITE_EMAILJS_TEMPLATE_ID` / `VITE_EMAILJS_PUBLIC_KEY` only to switch service or template.

#### 4. Claim the owner account
1. Visit `/blog/login` → **Create account** using your admin email (or use a magic link).
2. In Supabase → SQL Editor, run:

```sql
update public.profiles
set role = 'owner', verified = true, username = 'adityauniyal'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
```

3. Sign in at `/blog/admin` — the control room is now live.

#### 5. Deployment environment variables (Vercel)
The site deploys on **Vercel** (`adityauniyal.is-a.dev`). For the server-generated **sitemap** and **RSS** (`/blog/sitemap.xml`, `/blog/rss.xml` — served by the `api/` serverless routes), set in Vercel → Project → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GITHUB_TOKEN` — a classic personal access token with **`public_repo` read** scope only (no write scopes); used by `api/github.js` to raise the GitHub API rate limit for the Building page. Private: keep it server-side only. Optional — without it the endpoint works anonymously at the lower rate limit and never sends an `Authorization` header.
- `SITE_URL` (optional — overrides the canonical origin, e.g. when you add a custom domain)

Client-side vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_EMAILJS_*`) must also be set in Vercel for the journal to work in production — same values as your local `.env.local`.

Legacy `netlify/functions/` (SendGrid `sendFeedback`, sitemap/RSS mirrors) still work if you also keep a Netlify mirror; Vercel ignores that folder.

Also add your Supabase auth redirect: Supabase → Authentication → URL Configuration → add `https://adityauniyal.is-a.dev/blog/login` to **Redirect URLs** (keep `http://localhost:5173/blog/login` for local dev).

### Contributor publishing flow

```
New contributor:  DRAFT → SUBMITTED → REVIEW → APPROVED → PUBLISHED
Verified authors: may publish directly (bypass review)
Admin:            approve · reject · request changes (reject) · hide · archive · feature
```

To promote someone: `/blog/admin` → **Users** → change role / verify.

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

Articles are stored as **Tiptap JSON documents** (structured rich text, never raw HTML strings) and rendered through a
sanitizing pipeline (`src/lib/sanitize.ts`): unknown/unsafe nodes are stripped, all URLs pass `safeUrl`
(protocol-relative and non-http(s) schemes rejected — pinned by tests), and the document is rendered to React.
Supported: headings, bold/italic, links, lists, blockquotes, code blocks with language label + copy button,
inline code, images with captions, tables, dividers, callouts, YouTube/GitHub embeds.
Reading time is computed from the document's text nodes (words ÷ 200) — the formula is pinned by
`src/lib/sanitize.test.ts` and `src/lib/migration13-agreement.test.ts`, so the editor, the API layer,
and the SQL backfill can never disagree.

### Security summary

- RLS is **mandatory** on every table; policies live in `supabase/02-rls.sql`
- Storage uploads restricted to the owner's own `journal-media/<uid>/` folder, image MIME types only, 5 MB cap (enforced client-side and by bucket policy)
- Profile role changes blocked client-side; only `admin_set_user_role` RPC (server-checked) can change roles
- Newsletter + view-log inserts are the only anon-writable tables
- Search/trending/moderation run through SQL functions that re-check role server-side
- Contact + feedback forms are protected by a honeypot field (see `src/lib/emailjs.ts`)
- `vercel.json` ships global security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, empty `Permissions-Policy`) plus a `Content-Security-Policy-Report-Only` policy — check the browser console for reports before promoting it to enforcing

### Legal pages

The site ships a three-page legal layer, written to match the platform's real data flows:

| Page | Route | Source file |
| --- | --- | --- |
| Privacy Policy (formal) | `/privacy` | `src/pages/portfolio/Privacy.tsx` |
| What happens to your data (plain-language walkthrough) | `/data-use` | `src/pages/portfolio/DataUse.tsx` |
| Terms of Service | `/terms` | `src/pages/portfolio/Terms.tsx` |

**Where to edit:** all content lives in the listed component files as plain `Card` sections — edit the text, save, deploy. No CMS, no database rows. When the data practices change, update **all three** (they cross-link and must stay consistent) and bump the `LAST UPDATED` line at the top of each.

They are discoverable by design: linked from **both site footers**, surfaced on the **signup form** and the **contributor application**, cross-linked from each other, and included in **`api/sitemap.js`** for crawlers. Any new data-collecting surface (form, upload, integration) should get the same point-of-collection disclosure the signup and apply forms have.

### Local development

```bash
npm install
npm run dev             # Vite dev server on http://localhost:5173
```

Quality gates — `typecheck` and `test` run automatically before every build (locally and on Vercel, via the `prebuild` hook; a failure blocks the deploy). `lint` is run on demand and is not a deploy gate:

```bash
npm run typecheck       # tsc -b
npm test                # vitest — pins the reading-time formula, slug/URL safety,
                        # the SPA-404 host-config agreement, and SQL⇄TS word-count agreement
npm run lint            # eslint (run manually; not part of prebuild)
npm run build           # production build (runs typecheck + tests first)
```

Serverless routes (`/api/github`, `/api/sitemap`, `/api/rss`) run on Vercel; locally `npm run dev` serves the app and the Vercel rewrites handle the rest — no emulator needed.

---

## License

[MIT](LICENSE)
