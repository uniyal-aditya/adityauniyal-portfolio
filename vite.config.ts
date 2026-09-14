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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiDev()],
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
