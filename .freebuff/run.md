# Run doc — Aditya Uniyal Portfolio + AU_ Journal

Static HTML/CSS/JS site (no build step). The "dev server" is any static file
server serving the repository root. Netlify functions (sendFeedback, journal
sitemap/RSS) only run under `netlify dev`; for visual preview a plain static
server is sufficient — the journal pages detect the missing Supabase config and
render graceful empty states.

## Reproduce artifacts

Nothing to reproduce: there is no build step, no `.env` files in the repo, and
frontend Supabase keys are intentionally left blank in `js/supabase-config.js`
(see readme.md → "Setup" to configure the real backend).

Install is optional (only needed for `netlify dev` with functions):

```
npm install
```

## Run the server (static preview)

```
npx --yes serve . -l 8123 --no-clipboard
```

- Port: 8123 (project has no default port; 8123 avoids common dev ports)
- Serve the repo ROOT so `/blog/...`, `/css/...`, `/assets/...` all resolve
- Detached on Windows (PowerShell, stdout/stderr to separate files):

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npx.cmd' -ArgumentList '--yes','serve','.','-l','8123','--no-clipboard' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

## Optional: full Netlify emulation (functions + redirects)

```
npm install
npx netlify-cli dev --port 8888
```

This is heavier; use it only when testing the sendFeedback function or the
sitemap/RSS endpoints. Netlify-specific rewrites from netlify.toml (e.g.
`/blog/post/<slug>/` → `blog/post/index.html`) do NOT apply on a plain static
server — deep journal links 404 locally but work on Netlify. The directory
index pages (`/blog/`, `/blog/search/`, `/blog/dashboard/`, etc.) serve fine.
