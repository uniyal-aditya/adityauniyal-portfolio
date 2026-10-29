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
3. **CSP** is `Report-Only`; switch to enforcing after a few clean days.
4. **Not executed here**: `vite build` and the vitest suite (the bundled node_modules are Windows binaries; no network). Run `npm run build` once locally.
5. Resume PDF is auto-built from site content — replace with your real resume.
6. Dashboard / Admin / Post / Editor pages: reviewed by automated checks and targeted reading, not line-by-line.
