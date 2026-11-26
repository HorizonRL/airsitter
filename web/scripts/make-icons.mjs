// Renders the app icons used by the web manifest: node scripts/make-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('./icon.svg', import.meta.url))
const out = (f) => new URL(`../public/${f}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'))
// Maskable: shrink the artwork into the 80% safe zone on a full-bleed background.
const inner = await sharp(svg).resize(400, 400).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#08090b' } })
  .composite([{ input: inner, left: 56, top: 56 }]).png().toFile(out('icon-maskable-512.png'))
console.log('icons written')
