# Custom Domain Checklist — adityauniyal.is-a.dev

The site's canonical origin is `https://adityauniyal.is-a.dev`. Vercel hosts it; the subdomain is an
[is-a.dev](https://www.is-a.dev) registration — DNS lives as JSON files in the is-a.dev GitHub repo
(pull-request based), not in a registrar panel. Use this checklist whenever DNS, TLS, domain config,
or SEO-facing URLs change.

**Legend:** ✅ verified live · ☐ user action needed · ⚠️ known limitation / optional hardening

---

## 0 · Current state (probed 2026-10-02)

| Check | Result |
| --- | --- |
| DNS A record | `adityauniyal.is-a.dev → 216.198.79.1` (Vercel) ✅ |
| HTTPS homepage | `200 OK`, `Server: Vercel` ✅ |
| TLS certificate | active and Vercel-managed (Let's Encrypt; issuance works ⇒ nothing blocking it) ✅ |
| HSTS | `Strict-Transport-Security: max-age=63072000` ✅ |
| HTTP → HTTPS | `308 Permanent Redirect` to the HTTPS origin ✅ |
| `robots.txt` | `200`, `Sitemap:` line present ✅ |
| `/blog/sitemap.xml` | `200`, `application/xml` (Vercel rewrite → `api/sitemap`) ✅ |
| OG share image | `https://adityauniyal.is-a.dev/covers/flagship.png` → `200 image/png` ✅ |
| `www.` subdomain | no DNS record (does not resolve) — optional, see §1.3 |
| Discord site verification | `public/.well-known/discord` served ✅ |

---

## 1 · DNS (is-a.dev)

DNS for `*.is-a.dev` is managed by pull request to the [is-a-dev/register](https://github.com/is-a-dev/register)
repo — one JSON file per record in its `domains/` folder.

### 1.1 Required records

| is-a.dev file | Content |
| --- | --- |
| `domains/adityauniyal.json` | `{"owner": {…}, "records": {"A": ["216.198.79.1"]}}` |
| `domains/_vercel.adityauniyal.json` | `{"owner": {…}, "records": {"TXT": "<verification string>"}}` |

- The authoritative values are whatever Vercel shows at **Project → Settings → Domains →
  `adityauniyal.is-a.dev` → DNS records**. Older guides say `76.76.21.21`; the currently assigned
  value is `216.198.79.1`, which is what is live today.
- ⚠️ If Vercel's domain page ever shows a different A/TXT value, open a PR updating the is-a.dev
  files — mismatched records surface as "Invalid Configuration" on the domain.
- Do **not** add CAA records at the is-a.dev apex: none exist today, and Vercel's Let's Encrypt
  issuance depends on nothing blocking it.

### 1.2 After changing any is-a.dev file

1. Merge the PR and wait for the is-a.dev bot to deploy (usually < 5 min).
2. `nslookup adityauniyal.is-a.dev 1.1.1.1` → `216.198.79.1`.
3. Vercel → Settings → Domains: the domain flips to *Valid Configuration* and the SSL badge goes
   green. Certificate issuance/renewal is automatic once DNS validates — no manual step.

### 1.3 `www.` (optional — currently not configured)

- The apex is canonical; `www.adityauniyal.is-a.dev` does not resolve. Leaving it off is fine and
  matches is-a.dev's guidance to keep Vercel's "redirect to www" toggle **disabled**.
- To add it: create `domains/www.adityauniyal.json` with the same A value, attach
  `www.adityauniyal.is-a.dev` to the Vercel project, and let Vercel redirect it → apex.
  Canonical/OG URLs must never point at `www.` (§4).

---

## 2 · Vercel project config

| Item | Value | Status |
| --- | --- | --- |
| Domain attached to project | `adityauniyal.is-a.dev` (apex; www-redirect toggle off) | ✅ live |
| Production branch | `main` — every push auto-deploys | ✅ |
| `www` redirect toggle | off (see §1.3) | ✅ |

### Environment variables (Vercel → Settings → Environment Variables)

Client (public — Vite only exposes `VITE_`-prefixed vars):

| Var | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | e.g. `https://qnuegizjakzwgxfvihbd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key only — never the service-role key |
| `VITE_SITE_URL` | **leave unset** — code defaults to `https://adityauniyal.is-a.dev`; set it only when the origin actually changes (§7) |

Server (used by `api/sitemap.js`, `api/rss.js`, `api/github.js`):

| Var | Notes |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | power the dynamic sitemap/RSS; unset ⇒ static-only sitemap (still 200) |
| `SITE_URL` | **leave unset** — defaults to the canonical origin in code |
| `GITHUB_USERNAME` | `uniyal-aditya` |
| `GITHUB_TOKEN` | classic PAT, **no scopes**; enables heatmap/streaks on `/building` |

☐ After adding or changing any variable: **redeploy** (Deployments → ⋯ → Redeploy). Env changes
never apply to already-running deployments or functions.

---

## 3 · HTTPS / TLS

- Certificates are issued and renewed automatically by Vercel (Let's Encrypt). No recurring action.
- ☐ After any DNS change, confirm the cert badge on the domain page; if it sticks at
  "Generating certificate", re-check the `_vercel` TXT record (§1.1) before anything else.
- HTTP→HTTPS redirect and HSTS are Vercel defaults, verified live (§0).
- ⚠️ HSTS is `max-age=63072000` without `includeSubDomains`/`preload` — appropriate here, since
  `is-a.dev` is a Public Suffix List entry and subdomains of it are not all yours.

Quick certificate check:

```sh
curl -svI https://adityauniyal.is-a.dev/ 2>&1 | grep -E "subject:|issuer:|expire|verify"
```

---

## 4 · Canonical URLs & SEO

One rule: **every SEO-facing URL must be the exact origin `https://adityauniyal.is-a.dev`** — no
`www`, no scheme or trailing-slash drift. The origin is hardcoded (with env override) in five code
paths plus one static file:

| Concern | File | Mechanism |
| --- | --- | --- |
| Runtime SPA meta (canonical/OG/Twitter/JSON-LD) | `src/lib/seo.tsx` | `SITE = VITE_SITE_URL \|\| 'https://adityauniyal.is-a.dev'` |
| Static HTML fallback tags | `index.html` | literal `canonical` / `og:url` / `og:image` |
| Sitemap | `api/sitemap.js` | `SITE_URL \|\| 'https://adityauniyal.is-a.dev'` |
| RSS | `api/rss.js` (legacy twins: `netlify/functions/journalRss.js`, `journalSitemap.js`) | same default |
| Crawler entry | `public/robots.txt` | literal `Sitemap:` line |

**Already correct (verified live 2026-10-02):**
- ✅ `robots.txt` served with the sitemap line
- ✅ `/blog/sitemap.xml` → 200 XML (`vercel.json` rewrite to `api/sitemap`)
- ✅ Static fallback tags in the served HTML are correct (canonical/`og:url` on `/`)
- ✅ Per-route canonical/OG/JSON-LD emitted at runtime by `<Seo>`
- ✅ `noindex` on private routes (`/blog/login`, `/blog/dashboard`, `/blog/dashboard/editor`,
  `/blog/admin`) both at runtime and in the prebuilt static shells under `blog/*/index.html`;
  `robots.txt` also disallows them

**Worth knowing (not blockers):**
- ⚠️ **Soft 404s** — the SPA rewrite in `vercel.json` returns `200` + `index.html` for every
  non-API path, so `/blog/post/does-not-exist` is a 200 that renders `NotFound` client-side.
  Googlebot executes JS and handles this, but a true 404 status is better. Optional hardening:
  emit a static `404.html` and serve it via a Vercel catch route, or generate the rewrite list
  from published slugs at build time.
- ⚠️ **Meta is client-rendered** — link-preview crawlers that don't run JS (some Discord, Slack,
  WhatsApp clients) see the static `index.html` fallback tags, not per-route ones. Posts already
  ship prebuilt shells under `blog/`; if a specific page's share preview ever looks wrong,
  prerender that route.

Post-deploy smoke (every `canonical`/`og:url` line must show the exact origin):

```sh
curl -s https://adityauniyal.is-a.dev/terms | grep -iE 'canonical|og:url'
curl -s https://adityauniyal.is-a.dev/blog/sitemap.xml | grep -c '<loc>'
curl -s https://adityauniyal.is-a.dev/blog/rss.xml | grep -c '<item>'
```

---

## 5 · Supabase config

Project `qnuegizjakzwgxfvihbd`. The domain only matters in **Authentication → URL Configuration**
— all OAuth flows go through Supabase's own callback, which is domain-independent.

☐ 1. **Site URL** → `https://adityauniyal.is-a.dev` (no path, no trailing slash)
☐ 2. **Redirect URLs** must include, exactly:
   - `https://adityauniyal.is-a.dev/blog/login`
   - `http://localhost:5173/blog/login` (local dev)
☐ 3. Auth email templates (magic link, reset, invite) use `{{ .ConfirmationURL }}` so links inherit
   the Site URL — never hardcode the domain inside a template.
☐ 4. OAuth providers (GitHub / Google / Discord) need **no domain change**: their callback is
   `https://qnuegizjakzwgxfvihbd.supabase.co/auth/v1/callback`. Revisit only when adding a
   provider — walkthrough in `oauth-setup.md`.
- ℹ️ Because `is-a.dev` is on the Public Suffix List, cookies scope to your exact subdomain — good
  isolation, nothing to configure.

---

## 6 · Full verification runbook

Run after any DNS / Vercel / Supabase change. Expected values captured 2026-10-02.

```sh
# 1. DNS points at Vercel
nslookup adityauniyal.is-a.dev 1.1.1.1          # → 216.198.79.1

# 2. HTTPS + HSTS
curl -sI https://adityauniyal.is-a.dev/ | grep -iE 'HTTP/|strict-transport|server:'
#    HTTP/1.1 200 OK · Server: Vercel · Strict-Transport-Security: max-age=63072000

# 3. HTTP redirects to HTTPS
curl -sI http://adityauniyal.is-a.dev/ | grep -iE 'HTTP/|location'
#    HTTP/1.0 308 · Location: https://adityauniyal.is-a.dev/

# 4. Crawler surfaces
curl -s  https://adityauniyal.is-a.dev/robots.txt            # Sitemap line present
curl -sI https://adityauniyal.is-a.dev/blog/sitemap.xml      # 200, application/xml
curl -sI https://adityauniyal.is-a.dev/blog/rss.xml          # 200, application/rss+xml

# 5. Canonical tags present in served HTML
curl -s https://adityauniyal.is-a.dev/ | grep -iE 'canonical|og:url'

# 6. Share image
curl -sI https://adityauniyal.is-a.dev/covers/flagship.png   # 200, image/png

# 7. In a browser: /blog/login OAuth buttons complete end-to-end on the live domain
```

---

## 7 · If the origin ever changes

Work through in order, then re-run §6:

1. Update the five hardcoded/default origins in §4 (`src/lib/seo.tsx`, `index.html`,
   `api/sitemap.js`, `api/rss.js`, `public/robots.txt`) — or leave them and rely on step 2.
2. Set `VITE_SITE_URL` and `SITE_URL` in Vercel to the new origin; redeploy.
3. Point the new domain's DNS at Vercel (§1); keep the old domain attached with a redirect → new
   origin while any traffic or backlinks remain.
4. Update Supabase **Site URL** and **Redirect URLs** (§5).
5. Update the origin mentions in `readme.md`, `oauth-setup.md`, and this file.
