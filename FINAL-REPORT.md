# AU_ Portfolio + Journal + Building — Final Master-Task Report

**Date:** September 14, 2026 · **Repo:** `uniyal-aditya/adityauniyal-portfolio` · **Live:** https://adityauniyal.is-a.dev (Vercel) · **Latest commit:** `dc3d49f` (pushed, working tree clean)

---

## 1 · Technology stack

| Layer | Technology |
| --- | --- |
| UI | React 18 + TypeScript (strict), Vite 6, Tailwind CSS v4 (`@tailwindcss/vite`), custom CSS design system (`tokens/portfolio/journal/app-extras`) carrying the original identity |
| Routing | react-router-dom 6, lazy-loaded routes, `RecoveryCatch` + branded fallbacks |
| Motion | Framer Motion (page transitions, reveals, magnetic buttons, drawer) |
| 3D | React Three Fiber + drei + three 0.172, `three-vendor` chunk — lazy, never on critical path |
| State/data | TanStack Query 5, React Hook Form + Zod |
| Editor | Tiptap 2 (starter-kit, image, link, table, YouTube, placeholder, suggestion-driven slash commands) |
| Backend | Supabase (Postgres + Auth incl. GitHub/Google/Discord OAuth + Storage `journal-media`) |
| Icons | lucide-react + one custom `GithubIcon` (lucide dropped brand icons) |
| Serverless | Vercel functions (`api/sitemap.js`, `api/rss.js`, `api/github.js`) |
| Email | @emailjs/browser (contact), SendGrid (legacy Netlify `sendFeedback` preserved) |
| SEO | react-helmet-async (per-page meta/OG/JSON-LD), sitemap + RSS routes, robots.txt |

## 2 · Architecture

```
src/
├── components/  layout/ (Chrome, JournalShell, CommandPalette, AccountCluster)
│                journal/ (bits, NotificationBell)  system/ (Effects: Cursor+Scanline, Reveal)
│                ui/ (primitives incl. Magnetic)  icons/ (GithubIcon)
├── pages/  portfolio/ (Home Work Building Projects About Skills Connect Feedback Privacy NotFound)
│           blog/ (BlogHome PostPage AuthorPage TopicPage SeriesIndex/Page SearchPage ApplyPage)
│           dash/ (Dashboard EditorPage)  admin/ (AdminPage — 13 sections)  auth/ (LoginPage)
├── lib/  supabase.ts · journal-api.ts · github.ts · seo.tsx · sanitize.ts
├── data/ building.ts (manual Currently-Building config)  hooks/ types/ styles/
api/ (sitemap.js rss.js github.js)   netlify/functions/ (sendFeedback preserved)
supabase/ 01–09 migrations
```

## 3 · Supabase setup

Project `qnuegizjakzwgxfvihbd` — **live in production**. Apply migrations 01→09 in order in SQL Editor; all are idempotent (08 must be the corrected version). Auth: Email+password, magic link, reset (templates must use `{{ .ConfirmationURL }}`), OAuth GitHub/Google/Discord with `https://adityauniyal.is-a.dev` + localhost origins allow-listed. RLS on every table; admin RPCs enforce `is_admin()` server-side; a `BEFORE UPDATE` trigger blocks non-admin writes to comment pin columns (self-pin escalation hole closed by test). Storage: `journal-media` bucket, MIME/size validation client-side.

## 4 · GitHub integration setup (AU_ / BUILDING)

- `GITHUB_USERNAME=uniyal-aditya` (public) and `GITHUB_TOKEN` (classic PAT, **no scopes** — rate-limit lift only) as **Vercel env vars** → enables streaks + contribution heatmap; without a token the page still shows events/repos/languages and hides calendar with a setup hint. Never prefixed `VITE_`.
- `api/github.js`: 15-min TTL cache, `s-maxage`/`stale-while-revalidate` headers, serves stale ≤7 days on upstream failure, else HTTP 502 + real error state. Vite dev shim serves the same route locally.
- One manual config file: `src/data/building.ts` (current project, stack, repo, journal slugs).

## 5 · Environment variables

Client (public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_SITE_URL`.
Server (Vercel): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`, `GITHUB_USERNAME`, `GITHUB_TOKEN`. (Netlify legacy: `SENDGRID_API_KEY`, `TO_EMAIL`, `FROM_EMAIL`.)
**Never** `VITE_`-prefixed: service-role key, SendGrid secret, GitHub token. No service-role key exists client-side anywhere.

## 6 · Files — highlights

**Created this phase:** `api/github.js` · `src/pages/portfolio/Building.tsx` · `src/lib/github.ts` · `src/types/building.ts` · `src/types/api-github.d.ts` · `src/data/building.ts` · `src/components/icons/GithubIcon.tsx` · `src/components/layout/AccountCluster.tsx` · `supabase/08-analytics-fixes.sql` · `supabase/09-profile-fields.sql`
**Modified:** `App.tsx` (route), `Chrome.tsx` (nav/footer), `CommandPalette.tsx`, `Home.tsx` (building preview), `AuthorPage.tsx` (owner building block), `Dashboard.tsx` (location/interests edit), `useAuth.tsx` (isRecovery), `journal-api.ts` (viewer-tagged views), `vite.config.ts` (dev API shim), `tsconfig.node.json`, `.env.example`, `package.json` (+lucide-react).

## 7 · Features implemented (verified)

Journal: full public platform (home/featured/trending/latest/series/topics/search), Tiptap editor with slash commands, contributor workflow DRAFT→SUBMITTED→REVIEW→APPROVED→PUBLISHED, 13-section admin console, comments (nested, pinned, moderation stamps, self-pin guard), likes/bookmarks/follows, notifications bell, contributor applications, reading history, per-post + site analytics (all counters real; `view_count` synced via trigger; uniques = distinct signed-in readers).
Building: real GitHub timeline with filters, stats, heatmap (token-gated), repo cards, languages, honest status labels ("inferred from public GitHub activity"), proper error/empty states.
Cross-links: project ↔ repo ↔ journal ↔ building; homepage previews for Journal and Building; Building in nav/palette/footer.
Accounts: email+magic+OAuth, avatar cluster on **every** page (was journal-only), profile editing incl. avatar upload, location/interests (pending migration 09 run).

## 8 · Testing performed

- `tsc -b` ✅ `eslint` ✅ `vite build` ✅ on every change; bundle-hash-matched deploys verified against live site.
- Live end-to-end through preview browser: owner pin/unpin cycle with DB receipts; comment 300→200 embed fix; signup/login/reset (found + fixed reset stranding); self-pin attack reproduced then blocked; analytics audit traced every number to DB rows (found + fixed 4 bugs incl. an unguarded-RPC leak); mobile audits (2 passes, 31 routes, zero overflow); signed-in navigation on portfolio pages (found + fixed RecoveryCatch hijack).
- Negative tests: anon RPC calls rejected; reader self-pin silently reverted; wrong-password shows branded error.

## 9 · Remaining limitations (honest)

1. **Migrations 08 (re-run) and 09 must be run by you** in Supabase SQL Editor. Until 09 runs, location/interests edits won't persist.
2. **Contribution heatmap/streaks need `GITHUB_TOKEN`** in Vercel; anonymous mode intentionally hides them rather than faking data.
3. **Uniques counts only signed-in readers** — anonymous views have no identity; historical pre-fix view rows stay null by design.
4. **OAuth inside embedded webviews** (e.g. Freebuff preview) silently can't complete redirects — normal browsers unaffected; email/password works everywhere.
5. **Build-log numbers (#017 etc.)** in journal posts are editorial formatting, not a tracked sequence.
6. **Repo language stats** derive from the 8 most recently pushed repos (GitHub public API scope), not lifetime commit volume.
7. Legacy `netlify/functions` remain for the historical Netlify target; on Vercel the contact form uses EmailJS client-side and sitemap/RSS use `api/`.
