import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Dev-only shim for the /api/github Vercel route so `npm run dev` serves
// real GitHub data locally. Production uses api/github.js on Vercel.
function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/github', async (_req, res) => {
        try {
          const mod = await import('./api/github.js')
          const fakeReq: any = { method: 'GET', query: {}, headers: {} }
          const fakeRes: any = {
            setHeader: () => {},
            status(code: number) { this.statusCode = code; return this },
            json(body: unknown) { res.statusCode = this.statusCode ?? 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) },
          }
          await mod.default(fakeReq, fakeRes)
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String((e as Error).message || e) }))
        }
      })
    },
  }
}

// CI budget guard: fail the build when the eager bundle — the entry chunk
// plus everything it STATICALLY imports (dynamic imports stay lazy and are
// not counted) — grows past 700KB. This is the exact graph that silently
// grew ~520KB when react-dom was merged into tiptap-vendor (see the
// manualChunks note below); the budget pins the fix instead of trusting
// the chunking config to stay correct.
const EAGER_BUDGET_BYTES = 700 * 1024

function eagerBundleBudget(maxBytes = EAGER_BUDGET_BYTES): Plugin {
  return {
    name: 'eager-bundle-budget',
    apply: 'build',
    generateBundle(_, bundle) {
      const entry = Object.values(bundle).find(
        (c): c is Extract<(typeof c), { type: 'chunk' }> => c.type === 'chunk' && c.isEntry,
      )
      if (!entry) return

      const eager = new Set<string>([entry.fileName])
      const queue = [entry]
      while (queue.length) {
        const chunk = queue.pop()!
        for (const name of chunk.imports) {
          if (eager.has(name)) continue
          const dep = bundle[name]
          if (dep?.type === 'chunk') {
            eager.add(name)
            queue.push(dep)
          }
        }
      }

      const sizes = [...eager].map((name) => ({
        name,
        bytes: Buffer.byteLength((bundle[name] as { code: string }).code, 'utf8'),
      }))
      const total = sizes.reduce((sum, s) => sum + s.bytes, 0)
      const kb = (n: number) => (n / 1024).toFixed(1) + ' KB'

      console.log(`[eager-bundle-budget] eager graph (${sizes.length} chunk${sizes.length === 1 ? '' : 's'}): ${kb(total)} / ${kb(maxBytes)}`)
      for (const s of sizes) console.log(`  · ${s.name} — ${kb(s.bytes)}`)

      if (total > maxBytes) {
        this.error(
          `[eager-bundle-budget] Eager bundle is ${kb(total)}, over the ${kb(maxBytes)} budget ` +
            `(${sizes.map((s) => s.name).join(', ')}). Move heavy dependencies into lazy chunks ` +
            'or extend the manualChunks rules in vite.config.ts.',
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiDev(), eagerBundleBudget()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React must stay out of feature vendor chunks — if it lands inside
          // one, the entry bundle develops a static import of that chunk and
          // every visitor downloads it on every page (observed: react-dom was
          // merged into tiptap-vendor, making all pages load the 520KB editor).
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react-vendor'
          }
          // Keep three.js + R3F in their own lazy chunk — never loaded on the
          // critical path; the 3D components are React.lazy'd.
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three-vendor'
          }
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
            return 'tiptap-vendor'
          }
        },
      },
    },
  },
})
