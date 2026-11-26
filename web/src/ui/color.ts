/** Tiny colour helpers for canvas drawing. Colours are [r, g, b, a] with a in 0..1. */
export type RGBA = [number, number, number, number]

export function hex(h: string, a = 1): RGBA {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 8 ? s.slice(2) : s, 16)
  const alpha = s.length === 8 ? parseInt(s.slice(0, 2), 16) / 255 : 1
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha * a]
}

export const css = (c: RGBA) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, c[3])).toFixed(3)})`

export const alpha = (c: RGBA, a: number): RGBA => [c[0], c[1], c[2], a]

export function lerp(a: RGBA, b: RGBA, t: number): RGBA {
  const k = Math.max(0, Math.min(1, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]
}

export const WHITE = hex('#FFFFFF')
export const BLACK = hex('#000000')
export const TRANSPARENT: RGBA = [0, 0, 0, 0]

/** Deterministic PRNG (mulberry32) so a scene looks the same on every frame. */
export function seededRandom(seed: number) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { next, int: (n: number) => Math.floor(next() * n) }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export const LEFT_COLOR = '#9DB7D5'
export const RIGHT_COLOR = '#D9B98A'
export const sideColor = (side: 'LEFT' | 'RIGHT' | null) => (side === 'LEFT' ? LEFT_COLOR : side === 'RIGHT' ? RIGHT_COLOR : '#8E8E93')
