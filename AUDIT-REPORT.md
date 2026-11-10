# Full audit — aditya-uniyal-portfolio

Scope: all 90 source files (~17k lines): 15 portfolio/journal pages, layout/system components, hooks, lib, 3 API routes, 3 Netlify functions, 20 SQL migrations, configs, public assets and docs.

## Fixed
| # | Area | Problem | Fix |
|---|------|---------|-----|
| 1 | Assets | favicon.ico, favicon-32x32.png, apple-touch-icon.png, site.webmanifest, Resume PDF referenced but missing (404s, dead "Download Resume" ×3) | Generated all; manifest + icons added |
| 2 | Scroll reveal | `.reveal` sections that mount after async data (Work "Build journal", Home series callout) could stay invisible — hook scanned once | `useReveal` now uses a MutationObserver; verified in jsdom |
| 3 | About (mobile) | Education/Certifications used an inline 2-column grid with an 80px gap — crushed on phones | Moved to `.split-2` class, stacks under 768px |
| 4 | Command palette | "Copy contact email" copied silently, no feedback | Toast confirmation/error; address configurable via `VITE_CONTACT_EMAIL` |
| 5 | Caching | `/assets/*` was `immutable, 1 year` — would freeze the resume/favicons | Immutable only for hashed bundles; 1h for resume/icons/manifest |
| 6 | Netlify functions | CommonJS in a `"type":"module"` package (would crash); `sendFeedback` needs an uninstalled package | Renamed `.cjs`; SendGrid loaded lazily |
| 7 | Types | 13 `as any` casts in Admin/Post pages | Added the missing relation fields to `Comment`; casts removed |
| 8 | About | Two empty section labels | Filled ("// Principles", "// Education") |
| 9 | Housekeeping | Stray `portfolio-fixes.patch`; no Node version | Removed; `engines` + `.nvmrc` (Node 20) |
| 10 | Seasonal effect | No "Seazonify" exists in the code | Built a self-made canvas effect (5 Indian seasons), reduced-motion safe |

## Verified OK (no change needed)
- TypeScript strict build and ESLint: clean.
- Every `supabase.from()` table, `.rpc()` function and storage bucket used by the app exists in the SQL migrations.
- All internal links match a router path; all `target=_blank` links have `rel`.
- Auth: sign-in, sign-up, magic link, forgot/reset password, Google/GitHub/Discord OAuth.
- Forms (Contact/Feedback): honeypot, validation, EmailJS with working fallbacks.
- Upload validation (type + 5 MB), XSS-safe markdown/HTML rendering, env vars consistent across code and docs.
- Security headers present; CSP is report-only (see below).

## Known limitations / your decisions
1. **Contact email**: the palette defaults to `aditya@adityauniyal.dev`, but your site is on `adityauniyal.is-a.dev`. Set `VITE_CONTACT_EMAIL` to your real inbox.
2. **Newsletter ("AU Weekly")** collects emails (unconfirmed) but nothing confirms or sends them; the Privacy page mentions it.
3. **CSP** is now ENFORCED (`vercel.json`). If you ever add a third-party script, embed or API, add its host to the matching directive or the browser will block it. Rollback: rename the header back to `Content-Security-Policy-Report-Only`.
4. **Not executed here**: `vite build` and the vitest suite (the bundled node_modules are Windows binaries; no network). Run `npm run build` once locally.
5. Resume PDF is auto-built from site content — replace with your real resume.
6. Dashboard / Admin / Post / Editor pages: reviewed by automated checks and targeted reading, not line-by-line.

## Round 2 — mobile score + security (from your PageSpeed / SecurityHeaders reports)
- Enforced CSP (no `unsafe-inline` for scripts), added COOP + HSTS includeSubDomains.
- Google Fonts no longer block first paint (preload→stylesheet, allowed via CSP hash).
- 5 non-composited animations → transform/opacity (scanline, pulse rings); film-grain overlay skipped on phones.
- framer-motion → LazyMotion + `m` (same animations, smaller eager bundle).
- Contrast: `--dim-3` #6a6862 → #85837c (3.6:1 → 5.2:1).

## Round 3 — icons, socials popup, 3D/effects
- Replaced every emoji (Connect, Let's Connect modal, About interests) and glyph-icon (check, star, close, arrows) with Tabler / Phosphor / Heroicons / Lucide icons through `AppIcon`.
- Removed emojis from docs and one SQL comment; email subject uses "n/5" instead of a star.
- Socials centralised in `src/data/socials.ts`; click opens an in-site profile popup (lazy-loaded; focus trap, Esc, copy link, live GitHub stats).
- New effects: 3D tilt + glare on project/post cards, CSS-only 3D hero cube (desktop), button shine, icon tiles, glass/glow utilities.
- Web manifest fixed (name, theme colour, icon paths). Netlify functions renamed .cjs. Round-2 speed/security fixes re-applied.

## Round 4 — richer profile popups
- GitHub popup is a live preview: real avatar + bio, repos / followers / following / contributions / streak, 26-week heatmap, 3 recent repos (API now also returns followers/following).
- LinkedIn popup: headline, location, Featured (CodeSprint 2026 semi-finalist + 6 lnkd.in posts), Education, Certifications. X popup: @uaditya_dev.
- Popup body scrolls; the Open-profile button and profile switcher stay pinned. Tolerates partial API data.
- Contact email default set to adityauniyal.dev@gmail.com.

## Round 5 — LinkedIn data + Gallery
- LinkedIn popup now uses the real headline and the six post titles from your screenshots; links held back behind `LINKEDIN_LINKS_CHECKED`.
- New `/gallery` page: 4 hackathon milestones (Solve-a-Thon, CodeSprint 2026, Hacktoberfest Hack Day, SIH internal round), photo grid with filters, keyboard-accessible lightbox. Route added to App, vercel.json, netlify.toml, sitemap, nav, footer, Ctrl+K.
- Nav fits 7 links (hamburger from 860px).
- Real repo tests (43) now run offline in my checks and pass.

## Round 6 — browser uploads for the gallery
- `supabase/18-gallery.sql`: `gallery_items` table, RLS (public reads published rows only; all writes + hidden rows admin-only via `is_admin()`), CHECK limits, https-only image URLs, reuses `touch_updated_at()`.
- Admin -> Gallery: upload with live preview + size detection, edit, hide/show, delete (also removes the stored file). Cleans up the upload if saving fails.
- `/gallery` merges uploaded photos with the built-in ones and degrades gracefully when Supabase/the table is unavailable.
- 17 new repo tests (SQL <-> TypeScript limit agreement, RLS shape, validation, mapping) + 31 UI behaviour checks against a simulated Supabase. The SQL itself has not been run on a real Postgres from here.
