// Local header-faithful preview server.
//
// Vercel applies the security headers from vercel.json at its edge; the local
// Vite servers (dev/preview) do NOT. To verify the CSP-Report-Only policy, this
// server serves the real production build from dist/ and applies the exact
// headers parsed live from vercel.json — so we test the same config Vercel runs.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist')
const PORT = Number(process.env.PORT || 4173)

// Parse the real vercel.json headers so the preview can never drift from config.
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
const globalHeaderBlock = vercel.headers.find((h) => h.source === '/(.*)')
const assetsHeaderBlock = vercel.headers.find((h) => h.source === '/assets/(.*)')
const securityHeaders = globalHeaderBlock.headers
const assetHeaders = assetsHeaderBlock ? assetsHeaderBlock.headers : []

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

function applyHeaders(res, headers) {
  // vercel.json ships Permissions-Policy with an empty value on purpose; keep it.
  for (const { key, value } of headers) res.setHeader(key, value)
}

async function serveFile(res, filePath, extraHeaders = []) {
  const body = await readFile(filePath)
  applyHeaders(res, extraHeaders)
  res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream')
  res.statusCode = 200
  res.end(body)
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)

  // Apply the global security headers to every response (mirrors /(.*) block).
  applyHeaders(res, securityHeaders)

  // Normalize and prevent path traversal.
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(ROOT, safe)

  try {
    const info = await stat(filePath).catch(() => null)
    if (info && info.isDirectory()) filePath = join(filePath, 'index.html')
    const exists = await stat(filePath).catch(() => null)
    if (exists) {
      // Immutable caching for hashed /assets, mirroring the assets block.
      const isAsset = pathname.startsWith('/assets/')
      return await serveFile(res, filePath, isAsset ? assetHeaders : [])
    }
  } catch {
    /* fall through to SPA rewrite */
  }

  // SPA fallback for client-side routes (/blog, /work, etc.).
  try {
    return await serveFile(res, join(ROOT, 'index.html'), [])
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
}).listen(PORT, () => {
  console.log(`CSP preview serving dist/ with vercel.json headers on http://localhost:${PORT}`)
})
