import { Seat, SeatMap, Side } from '../aircraft/seatMap'
import { RouteSample, groundOn } from '../flight/analyzer'
import { EARTH_RADIUS_KM, deg, normalizeAngle } from '../geo/geo'
import { BLACK, RGBA, TRANSPARENT, WHITE, alpha, css, hex, lerp, roundRect, seededRandom } from './color'

export type Ground = 'LAND' | 'WATER'

/** What is outside the window. */
export interface WindowScene {
  sunElevation: number
  /** Horizontal angle of the sun relative to the viewing direction, degrees; + = right of view centre. */
  sunX: number
  ground: Ground
  altitudeFt: number
  seed: number
}

export function sceneFrom(sample: RouteSample, side: Side, seed: number): WindowScene {
  const look = side === 'LEFT' ? -90 : 90
  return {
    sunElevation: sample.sun.elevation,
    sunX: normalizeAngle(sample.sunRelative - look),
    ground: groundOn(sample, side) ? 'LAND' : 'WATER',
    altitudeFt: sample.altitudeFt,
    seed,
  }
}

export function smooth(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const SKY_KEYS: [number, RGBA, RGBA][] = [
  [-18, hex('#02040B'), hex('#070C1C')],
  [-10, hex('#070B22'), hex('#1B2348')],
  [-4, hex('#121A44'), hex('#6A4C7A')],
  [0, hex('#23356E'), hex('#F08A5D')],
  [6, hex('#3567B0'), hex('#F7C08A')],
  [15, hex('#2F6FD0'), hex('#A9D3F5')],
  [40, hex('#1E5FC6'), hex('#9CCBF2')],
]

export function skyColors(el: number): [RGBA, RGBA] {
  if (el <= SKY_KEYS[0][0]) return [SKY_KEYS[0][1], SKY_KEYS[0][2]]
  for (let i = 1; i < SKY_KEYS.length; i++) {
    const [e1, a1, b1] = SKY_KEYS[i]
    const [e0, a0, b0] = SKY_KEYS[i - 1]
    if (el <= e1) {
      const t = (el - e0) / (e1 - e0)
      return [lerp(a0, a1, t), lerp(b0, b1, t)]
    }
  }
  const last = SKY_KEYS[SKY_KEYS.length - 1]
  return [last[1], last[2]]
}

function vGrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, cols: RGBA[]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  cols.forEach((c, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), css(c)))
  return g
}

function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, cols: RGBA[]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r))
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), css(c)))
  return g
}

function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, style: string | CanvasGradient) {
  ctx.beginPath(); roundRect(ctx, x, y, w, h, r); ctx.fillStyle = style; ctx.fill()
}

function fillOval(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: string) {
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2)
  ctx.fillStyle = style; ctx.fill()
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: string | CanvasGradient) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = style; ctx.fill()
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, style: string, width: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke()
}

interface Rect { l: number; t: number; w: number; h: number }

/**
 * Renders the view from seat: the cabin wall, the real window positions next to that row
 * (so misaligned rows look misaligned), the wing/engine if they are in view, and the outside scene.
 */
export function drawWindowView(ctx: CanvasRenderingContext2D, w: number, h: number, sm: SeatMap, seat: Seat, scene: WindowScene) {
  const ac = sm.aircraft
  const cx = w / 2
  const cy = h * 0.46
  const pxPerDeg = w / 75
  // focal length for 3-D objects outside (wing/engines), consistent with the window scale below
  const focal = (w / 50) * 10
  const seatW = seat.row.section.seatWidthIn
  const distIn = 10 + seat.seatsFromWall * (seatW + 2) + seat.aislesFromWall * 20
  const k = (w / 50) * (10 / distIn)
  const xSign = seat.side === 'LEFT' ? -1 : 1
  const eye = seat.row.eyeIn
  const daylight = smooth(-8, 6, scene.sunElevation)

  ctx.clearRect(0, 0, w, h)
  // --- Cabin wall ---
  const wallLight = lerp(hex('#3A3B42'), hex('#E2DED6'), 0.35 + 0.65 * daylight)
  const wallDark = lerp(hex('#24252B'), hex('#B9B3A8'), 0.35 + 0.65 * daylight)
  ctx.fillStyle = vGrad(ctx, 0, h, [wallLight, wallDark]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = css(alpha(wallDark, 0.6)); ctx.fillRect(0, 0, w, h * 0.06)
  ctx.fillStyle = css(alpha(wallDark, 0.5)); ctx.fillRect(0, h * 0.86, w, h * 0.14)

  const range = w / 2 / k + ac.windowWidthIn * 2
  const ww = ac.windowWidthIn * k
  const wh = ac.windowHeightIn * k
  const windows: Rect[] = sm.windowOffsetsNear(eye, range).map((o) => {
    const x = cx + xSign * o * k
    return { l: x - ww / 2, t: cy - wh / 2, w: ww, h: wh }
  })

  // bezels
  for (const r of windows) {
    const pad = r.w * 0.2
    const b = { l: r.l - pad, t: r.t - pad, w: r.w + 2 * pad, h: r.h + 2 * pad }
    fillRR(ctx, b.l, b.t, b.w, b.h, b.w * 0.48, vGrad(ctx, b.t, b.t + b.h, [wallDark, wallLight]))
    ctx.beginPath(); roundRect(ctx, b.l, b.t, b.w, b.h, b.w * 0.48)
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke()
  }

  if (windows.length) {
    ctx.save()
    ctx.beginPath()
    for (const r of windows) roundRect(ctx, r.l, r.t, r.w, r.h, r.w * 0.45)
    ctx.clip()
    drawOutside(ctx, w, h, scene, sm, seat, cx, cy, pxPerDeg, focal, distIn, xSign, daylight)
    ctx.restore()
  }

  for (const r of windows) {
    // shade pulled slightly down + glass reflections
    fillRR(ctx, r.l, r.t, r.w, r.h * 0.1, r.w * 0.45, css(alpha(hex('#EDEBE6'), 0.95 * (0.4 + 0.6 * daylight))))
    fillRR(ctx, r.l + r.w * 0.12, r.t + r.h * 0.15, r.w * 0.12, r.h * 0.6, r.w, 'rgba(255,255,255,0.08)')
    ctx.beginPath(); roundRect(ctx, r.l, r.t, r.w, r.h, r.w * 0.45)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.stroke()
  }

  // neighbours' heads for middle / aisle seats
  if (seat.kind !== 'WINDOW') {
    const people = Math.min(2, seat.seatsFromWall)
    for (let i = 0; i < people; i++) {
      const scale = i === 0 ? 1 : 0.75
      const px = cx + xSign * (i === 0 ? -0.08 : 0.22) * w
      drawHead(ctx, px, h * (0.78 + 0.06 * i), w * 0.13 * scale, daylight)
    }
  }

  // cabin lighting at night
  if (daylight < 0.5) { ctx.fillStyle = css(alpha(hex('#0A0F2A'), (0.5 - daylight) * 0.5)); ctx.fillRect(0, 0, w, h) }
}

function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, daylight: number) {
  const col = css(lerp(hex('#0E0F14'), hex('#3B2F2A'), daylight * 0.6))
  fillOval(ctx, x - r * 1.9, y + r * 0.7, r * 3.8, r * 2.4, col)
  fillOval(ctx, x - r * 0.8, y - r * 0.9, r * 1.6, r * 2.0, col)
}

function drawOutside(
  ctx: CanvasRenderingContext2D, w: number, h: number, scene: WindowScene, sm: SeatMap, seat: Seat,
  cx: number, cy: number, pxPerDeg: number, focal: number, distIn: number, xSign: number, daylight: number,
) {
  const el = scene.sunElevation
  const altKm = scene.altitudeFt * 0.0003048
  const dip = deg(Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altKm)))
  const horizonY = cy + (dip + 0.6) * pxPerDeg
  const rnd = seededRandom(scene.seed * 7919 + 17)

  // --- Sky ---
  const [top, horizonCol] = skyColors(el)
  const toward = Math.max(0, Math.min(1, (100 - Math.abs(scene.sunX)) / 100))
  const awayHorizon = el >= -7 && el <= 4 ? hex('#B98AA5') : lerp(horizonCol, top, 0.3) // belt of Venus
  const hz = lerp(awayHorizon, horizonCol, 0.35 + 0.65 * toward)
  ctx.fillStyle = vGrad(ctx, 0, horizonY, [top, lerp(top, hz, 0.5), hz]); ctx.fillRect(0, 0, w, horizonY)

  const sunPx = cx + scene.sunX * pxPerDeg
  const sunPy = cy - el * pxPerDeg
  if (el > -10 && Math.abs(scene.sunX) < 110) {
    const glowCol = el < 8 ? hex('#FFA25E') : hex('#FFF4D6')
    const strength = Math.max(0, Math.min(1, smooth(-10, -1, el) * (1 - Math.abs(scene.sunX) / 110)))
    const gy = Math.max(sunPy, horizonY - 4)
    circle(ctx, sunPx, gy, w * 0.6, radial(ctx, sunPx, gy, w * 0.6, [alpha(glowCol, 0.75 * strength), TRANSPARENT]))
  }
  if (el < -8) {
    const a = smooth(-8, -14, el)
    for (let i = 0; i < 90; i++) {
      const x = rnd.next() * w, y = rnd.next() * horizonY * 0.95
      circle(ctx, x, y, 0.6 + rnd.next() * 1.4, css(alpha(WHITE, a * (0.3 + 0.7 * rnd.next()))))
    }
  }
  // at altitude the horizon dips, so the sun stays visible a few degrees below 0°
  if (el > -(dip + 1.5) && Math.abs(scene.sunX) < 80) {
    const r = 1.1 * pxPerDeg
    const col = el < 6 ? hex('#FFC07A') : hex('#FFFBEA')
    circle(ctx, sunPx, sunPy, r * 3, radial(ctx, sunPx, sunPy, r * 3, [WHITE, col, alpha(col, 0)]))
    circle(ctx, sunPx, sunPy, r, '#fff')
  }

  // --- Ground / sea ---
  const gt = horizonY
  const gh = h - gt
  const golden = smooth(12, 2, el) * smooth(-4, 1, el)
  const s = w / 400
  if (scene.ground === 'WATER') {
    const deep = lerp(hex('#02050B'), hex('#1B4A72'), daylight)
    const far = lerp(hex('#060A16'), lerp(hex('#7FA2C2'), hex('#E0A27A'), golden), daylight)
    ctx.fillStyle = vGrad(ctx, gt, h, [far, deep]); ctx.fillRect(0, gt, w, gh)
    for (let i = 0; i < 70; i++) {
      const t = rnd.next()
      const y = gt + gh * t * t
      const len = (8 + 40 * t) * s
      const x = rnd.next() * w
      line(ctx, x, y, x + len, y, css(alpha(WHITE, 0.05 + 0.08 * daylight)), 1 + 2 * t)
    }
    if (el > -1 && Math.abs(scene.sunX) < 70) {
      const col = el < 8 ? hex('#FFC27A') : WHITE
      for (let i = 0; i < 140; i++) {
        const t = rnd.next()
        const y = gt + gh * t * t * 0.9
        const spread = (6 + 60 * t) * s * (1 + (25 - Math.max(0, Math.min(25, el))) / 25)
        const x = sunPx + (rnd.next() - 0.5) * spread * 2
        line(ctx, x, y, x + spread * 0.25, y, css(alpha(col, 0.25 + 0.5 * rnd.next())), 1.5 + 2 * t)
      }
    }
  } else {
    const baseNear = lerp(hex('#050605'), hex('#5E7A40'), daylight)
    const baseFar = lerp(hex('#07080C'), lerp(hex('#A3B396'), hex('#D9A57E'), golden), daylight)
    ctx.fillStyle = vGrad(ctx, gt, h, [baseFar, baseNear]); ctx.fillRect(0, gt, w, gh)
    const fieldCols = ['#6E8B45', '#8A7B4F', '#4F6A35', '#A08C5E', '#3F5A2E'].map((c) => hex(c))
    for (let i = 0; i < 160; i++) {
      const t = rnd.next()
      const depth = t * t
      const y = gt + gh * depth
      const fw = (10 + 90 * depth) * s
      const fh = fw * (0.12 + 0.25 * depth)
      const x = rnd.next() * (w + fw) - fw
      const col = lerp(baseFar, fieldCols[rnd.int(fieldCols.length)], 0.25 + 0.75 * depth)
      fillOval(ctx, x, y, fw, fh, css(alpha(lerp(hex('#060706'), col, daylight), 0.55)))
    }
    // river
    ctx.beginPath()
    let x = rnd.next() * w, y = gt + 2
    ctx.moveTo(x, y)
    while (y < h) {
      const step = 6 + ((y - gt) / gh) * 40
      x += (rnd.next() - 0.5) * step * 2.2
      y += step
      ctx.lineTo(x, y)
    }
    ctx.strokeStyle = css(alpha(lerp(hex('#0A0F1A'), hex('#7FA8C9'), daylight), 0.6)); ctx.lineWidth = 1.5; ctx.stroke()
    // city lights at night
    if (daylight < 0.6) {
      const a = 1 - daylight / 0.6
      for (let c = 0; c < 8; c++) {
        const t = rnd.next()
        const ccx = rnd.next() * w
        const ccy = gt + gh * t * t
        const spread = (4 + 50 * t * t) * s
        for (let j = 0; j < 25; j++) {
          const dx = (rnd.next() - 0.5) * spread * 2
          const dy = (rnd.next() - 0.5) * spread * 0.4
          circle(ctx, ccx + dx, ccy + dy, 0.8 + 1.2 * t, css(alpha(hex('#FFC266'), a * (0.4 + 0.6 * rnd.next()))))
        }
      }
    }
  }
  // clouds below
  const cloudCol = lerp(hex('#1A1C24'), lerp(WHITE, hex('#FFD2A8'), golden), daylight)
  for (let i = 0; i < 14; i++) {
    const t = rnd.next()
    const depth = t * t
    const y = gt + gh * depth * 0.95
    const cw = (14 + 80 * depth) * s
    const x = rnd.next() * (w + cw) - cw / 2
    for (let j = 0; j < 5; j++) {
      const ox = (j - 2) * cw * 0.28 + (rnd.next() - 0.5) * cw * 0.2
      const r = cw * (0.18 + rnd.next() * 0.14)
      fillOval(ctx, x + ox - r, y - r * 0.5, r * 2, r * 0.9, css(alpha(cloudCol, 0.55)))
    }
  }
  // horizon haze
  const haze = lerp(hex('#0D1226'), hz, 0.8)
  const y0 = horizonY - 2.5 * pxPerDeg
  ctx.fillStyle = vGrad(ctx, y0, horizonY + 3 * pxPerDeg, [TRANSPARENT, alpha(haze, 0.7), TRANSPARENT])
  ctx.fillRect(0, y0, w, 5.5 * pxPerDeg)

  drawWing(ctx, sm, seat, cx, cy, focal, distIn, xSign, daylight, el, scene.sunX)
}

function drawWing(
  ctx: CanvasRenderingContext2D, sm: SeatMap, seat: Seat, cx: number, cy: number, focal: number, distIn: number,
  xSign: number, daylight: number, el: number, sunX: number,
) {
  const ac = sm.aircraft
  const eye = seat.row.eyeIn
  /** Perspective projection: z = along fuselage (in), lat = outward from wall (in), drop = below eye (in). */
  const p = (z: number, lat: number, drop: number): [number, number] => {
    const depth = Math.max(8, distIn + lat)
    return [cx + xSign * (focal * (z - eye)) / depth, cy + (focal * drop) / depth]
  }
  const semi = ac.widebody ? 1150 : ac.propeller ? 480 : 560
  const rootLE = sm.wingStartIn
  const rootTE = sm.wingEndIn
  const chord = rootTE - rootLE
  const sweep = ac.propeller ? 0.05 : 0.5
  const high = ac.wing === 'HIGH'
  const rootDrop = high ? -70 : ac.widebody ? 95 : 65
  const dihedral = high ? -0.01 : 0.06
  const tipLE = rootLE + sweep * semi
  const tipTE = tipLE + chord * 0.3
  const tipDrop = rootDrop - semi * dihedral

  const light = lerp(hex('#15171C'), hex('#E6EAEF'), 0.15 + 0.85 * daylight)
  const dark = lerp(hex('#0B0C10'), hex('#A9B2BE'), 0.15 + 0.85 * daylight)

  const wingPath = () => {
    ctx.beginPath()
    ctx.moveTo(...p(rootLE, 0, rootDrop))
    ctx.lineTo(...p(tipLE, semi, tipDrop))
    ctx.lineTo(...p(tipTE, semi, tipDrop))
    ctx.lineTo(...p(rootTE, 0, rootDrop))
    ctx.closePath()
  }
  const near = p((rootLE + rootTE) / 2, 0, rootDrop)
  const far = p((tipLE + tipTE) / 2, semi, tipDrop)

  const engineLats = ac.engines === 4 ? [semi * 0.33, semi * 0.62] : [ac.propeller ? semi * 0.28 : semi * 0.33]
  const nacLen = ac.widebody ? 190 : ac.propeller ? 150 : 140
  const nacDia = ac.widebody ? 125 : ac.propeller ? 45 : 75

  const engine = (lat: number) => {
    const le = rootLE + sweep * lat
    const front = le - nacLen * (ac.propeller ? 0.3 : 0.55)
    const drop = high ? rootDrop + 10 : rootDrop + nacDia * 0.75
    const top = p(front, lat, drop - nacDia / 2)
    const bottom = p(front + nacLen, lat, drop + nacDia / 2)
    const l = Math.min(top[0], bottom[0]), r = Math.max(top[0], bottom[0])
    const hgt = bottom[1] - top[1]
    fillRR(ctx, l, top[1], r - l, hgt, hgt / 2, vGrad(ctx, top[1], bottom[1], [light, dark]))
    const inlet = p(front, lat, drop)
    const ir = hgt / 2
    fillOval(ctx, inlet[0] - ir * 0.35, inlet[1] - ir * 0.9, ir * 0.7, ir * 1.8, '#3A3F48')
    if (ac.propeller) {
      const pr = ir * 3.2
      fillOval(ctx, inlet[0] - pr * 0.25, inlet[1] - pr, pr * 0.5, pr * 2, 'rgba(0,0,0,0.18)')
    }
  }

  if (!high) engineLats.forEach(engine)
  const g = ctx.createLinearGradient(near[0], near[1], far[0], far[1])
  g.addColorStop(0, css(light)); g.addColorStop(1, css(dark))
  wingPath(); ctx.fillStyle = g; ctx.fill()
  // leading-edge highlight band
  ctx.beginPath()
  ctx.moveTo(...p(rootLE, 0, rootDrop)); ctx.lineTo(...p(tipLE, semi, tipDrop))
  ctx.lineTo(...p(tipLE + chord * 0.05, semi, tipDrop)); ctx.lineTo(...p(rootLE + chord * 0.15, 0, rootDrop))
  ctx.closePath(); ctx.fillStyle = css(alpha(WHITE, 0.12 + 0.15 * daylight)); ctx.fill()
  // flap hinge line and sun sheen
  const f1 = p(rootLE + chord * 0.78, 0, rootDrop)
  const f2 = p(tipLE + chord * 0.3 * 0.78, semi * 0.7, rootDrop - semi * 0.7 * dihedral)
  line(ctx, f1[0], f1[1], f2[0], f2[1], css(alpha(dark, 0.7)), 2)
  if (el > 0 && Math.abs(sunX) < 70 && !high) { wingPath(); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill() }
  wingPath(); ctx.strokeStyle = css(alpha(BLACK, 0.3)); ctx.lineWidth = 1.5; ctx.stroke()
  if (high) engineLats.forEach(engine)

  // winglet + navigation light (red on the left wing, green on the right)
  const tip = p(tipTE - chord * 0.1, semi, tipDrop)
  if (!ac.propeller) {
    const wl = p(tipTE, semi, tipDrop - 90)
    line(ctx, tip[0], tip[1], wl[0], wl[1], css(dark), 5)
  }
  const navCol = seat.side === 'LEFT' ? hex('#FF3B30') : hex('#34C759')
  const glow = 0.35 + 0.65 * (1 - daylight)
  circle(ctx, tip[0], tip[1], 18, radial(ctx, tip[0], tip[1], 18, [alpha(navCol, glow), TRANSPARENT]))
  circle(ctx, tip[0], tip[1], 3, css(navCol))
}
