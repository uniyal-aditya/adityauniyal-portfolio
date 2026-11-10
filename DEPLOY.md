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

## Security headers
CSP is enforced in `vercel.json`. After deploy, re-scan at securityheaders.com and check the browser console for `Refused to ...` messages on /, /blog, a post page (YouTube embed) and the login page.

## Socials
Every social link lives in `src/data/socials.ts` (GitHub, X, LinkedIn). Edit it there and the footer, About, Connect and "Let's Connect" modal all update. A normal click opens the in-site profile popup; middle-click / Ctrl-click still opens the real profile in a new tab.
LinkedIn, X and GitHub forbid embedding, so the popup is a profile card with an "Open profile" button, not a live iframe.

## Icons
`src/components/icons/AppIcon.tsx` is the one place that maps each glyph to Tabler, Phosphor, Heroicons or Lucide. Use `<AppIcon name="github" />`. Change an entry there to swap a glyph's library.

## Effects
`src/styles/fx.css` (3D tilt cards, hero cube, button shine, glass/glow utilities, popup styling). All motion is transform/opacity only, desktop-only where heavy, and disabled for prefers-reduced-motion.

## Editing the LinkedIn / X popups
GitHub is live (from `/api/github`). LinkedIn and X can't be read automatically, so their popups show the snapshot in `src/data/socials.ts`:
- `headline`, `location`, `blurb` and `sections` (Featured, Education, Licenses & certifications) for LinkedIn.
- The six lnkd.in posts sit in `LINKEDIN_POSTS` at the top of that file. Replace each `title` ("LinkedIn post 1" ...) with the real post title.
- To add or remove a row, edit the `items` arrays; rows with a `url` become links.

## Gallery & milestones (`/gallery`)
- **Photos / certificates:** put the image in `public/gallery/`, then add one entry to `src/data/gallery.ts` (path, alt text, title, tag, real pixel width/height). Filter chips and the lightbox pick it up automatically.
- **Hackathons / milestones:** edit `src/data/milestones.ts`. Entries with `start` / `end` dates get an automatic Upcoming / Completed badge.
- The two certificates shipped are cropped from LinkedIn screenshots (about 500 px wide). Replace them with the original files (same filenames) for a sharper result and update `width` / `height`.
- Team members are not named on the page. Add them in the milestone `role` text if you want to credit them.

## LinkedIn post links
The six lnkd.in links are wired in `src/data/socials.ts` (`LINKEDIN_POSTS`) but stay hidden until you open each one, confirm it matches its title, and set `LINKEDIN_LINKS_CHECKED = true`.

## Gallery uploads from the browser (Admin -> Gallery)
1. **One-time:** run `supabase/18-gallery.sql` in the Supabase SQL Editor (safe to re-run).
2. Sign in as an admin/owner and open `/blog/admin/gallery`.
3. Choose an image (JPEG / PNG / WebP, max 5 MB), add a title (+ optional caption, alt text, tag, date) and click **Upload to gallery**. It appears on `/gallery` straight away (the public page caches for up to 5 minutes).
4. You can edit, hide/show, or delete any uploaded image there. Hidden images are never shown publicly.
- Uploaded photos show first (newest first), followed by the built-in ones from `src/data/gallery.ts`.
- If migration 18 has not been run, `/gallery` simply shows the built-in photos and the admin tab explains what is missing.
- Images are stored in the existing public `journal-media` bucket, inside the uploading admin's own folder.
