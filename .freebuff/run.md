# Run doc — Aditya Uniyal Portfolio + AU_ / JOURNAL

React 18 + TypeScript + Vite 6 + Tailwind v4 SPA (react-router). All routes —
portfolio (`/`, `/work`, `/projects`, `/about`, `/skills`, `/connect`,
`/feedback`, `/privacy`) and Journal (`/blog`, `/blog/post/:slug`, `/blog/login`,
`/blog/dashboard`, `/blog/admin/:section`, …) — are client-side routes served by
the Vite dev server or by the `dist/` build on Netlify.

## Reproduce artifacts

1. Install dependencies (needed for dev server and build):

   ```
   npm install
   ```

2. Optional — configure the Supabase backend: copy `.env.example` to `.env.local`
   and fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (public anon key
   only; see readme.md → "Setup" and `supabase/*.sql` for the backend). Without
   it every Journal page renders graceful "No data yet." empty states — the
   portfolio is fully independent of it.

No other artifacts are required; there are no secrets in the repo.

## Run the dev server

```
npm run dev
```

Vite defaults to port 5173. If it is taken, pass an explicit port:

```
npm run dev -- --port 5173 --strictPort
```

Detached on Windows (PowerShell; stdout/stderr MUST go to different files):

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5173','--strictPort' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

Then confirm the process survived and the URL answers:

```
powershell -NoProfile -Command "Get-Process -Id <pid>"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
```

## Checks

```
npm run typecheck   # tsc -b
npm run lint        # eslint .
npm run build       # vite build -> dist/
```

## Deployment / Netlify notes

- `netlify.toml` builds with `npm run build` and publishes `dist/`; SPA
  fallback (`/* -> /index.html`) keeps deep journal routes working.
- Netlify functions (`sendFeedback`, `journalSitemap`, `journalRss`) run under
  `npx netlify-cli dev` if functions need local testing — heavier than
  `npm run dev`, use only for function work.
