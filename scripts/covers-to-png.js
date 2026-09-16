/**
 * Regenerate the 1200x630 PNG twins for the bundled SVG covers.
 * SVGs stay as the in-app artwork (crisp at any size, tiny); the PNGs
 * exist purely for link-preview crawlers (og:image), which mostly
 * cannot rasterize SVG.
 *
 * Usage: npm run covers:png   (requires the sharp devDependency)
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const dir = path.join(__dirname, '..', 'public', 'covers')
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.replace(/\.svg$/, ''))

;(async () => {
  for (const name of files) {
    const svg = fs.readFileSync(path.join(dir, name + '.svg'))
    await sharp(svg, { density: 96 })
      .resize(1200, 630, { fit: 'cover', background: '#0a0a08' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, name + '.png'))
    const kb = (fs.statSync(path.join(dir, name + '.png')).size / 1024).toFixed(0)
    console.log(name + '.png written, ' + kb + ' KB')
  }
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
