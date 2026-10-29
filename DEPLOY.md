# Deploy checklist (Vercel)

1. Push this folder to GitHub (`node_modules`, `.env.local` are git-ignored).
2. Vercel → **Add New Project** → import the repo. Framework: **Vite** (auto). Build: `npm run build`, output: `dist`. Node 20+.
3. **Environment variables** (Project → Settings → Environment Variables):
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase **anon** public key |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | same values (sitemap / RSS API routes) |
   | `SITE_URL` | `https://adityauniyal.is-a.dev` |
   | `GITHUB_USERNAME` | `uniyal-aditya` |
   | `GITHUB_TOKEN` | classic PAT, **no scopes** (enables heatmap/streaks) |
   | `VITE_CONTACT_EMAIL` | your real contact email (used by the Ctrl+K "Copy contact email" action) |
   | `VITE_SEASONAL_FX` | optional — `off` disables the seasonal effect |

   Set these for **Production** (and Preview if you want previews to work), then redeploy — `VITE_*` values are baked in at build time.
4. Supabase: run `supabase/01…17` in order (see `readme.md`). In Auth → URL Configuration set **Site URL** to `https://adityauniyal.is-a.dev` and add `https://adityauniyal.is-a.dev/**` plus `http://localhost:5173/**` to Redirect URLs (login, magic-link and password-reset all redirect to `/blog/login`). Enable the OAuth providers (see `oauth-setup.md`). Your own profile must use the username `adityauniyal` — the homepage journal teaser and Work page look it up (`OWNER_USERNAME` in `src/lib/supabase.ts`).
5. Domain: add `adityauniyal.is-a.dev` in Vercel → follow `CUSTOM-DOMAIN-CHECKLIST.md`.
6. Replace `public/assets/Aditya_Uniyal_Resume.pdf` with your real resume (the bundled one is auto-built from the site's own content).
7. Post-deploy smoke test: `/`, `/work`, `/blog`, `/blog/sitemap.xml`, `/blog/rss.xml`, a bad URL (should show the 404 page), contact form, favicon.

## Seasonal effect
Self-made canvas effect in `src/components/system/SeasonalEffect.tsx` (winter / spring / summer / monsoon / autumn by month, off for reduced-motion). Preview with `?season=winter` etc.
