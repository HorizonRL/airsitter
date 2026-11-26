import { CABIN_CLASS } from '../aircraft/aircraft'
import { QUALITY, Seat, SeatMap, Side } from '../aircraft/seatMap'
import { LEFT_COLOR, RIGHT_COLOR, roundRect } from './color'

export interface SeatRect { seat: Seat; x: number; y: number; w: number; h: number }

const units = (layout: string) => [...layout].reduce((s, c) => s + (c === '-' ? 0.65 : 1), 0)

/** Positions every seat of a top-down cabin map for a given canvas width. */
export class CabinLayout {
  readonly cell: number
  readonly inner: number
  readonly left: number
  readonly right: number
  readonly wall = 7
  readonly pxPerIn: number
  readonly top: number
  readonly total: number
  readonly seats: SeatRect[] = []
  readonly rowLabels: { row: number; x: number; y: number; exit: boolean }[] = []
  readonly headers: { text: string; x: number; y: number }[] = []

  constructor(public readonly sm: SeatMap, public readonly width: number) {
    const maxUnits = Math.max(...sm.aircraft.sections.map((s) => units(s.layout)))
    this.cell = Math.min(46, (width * 0.7) / maxUnits)
    this.inner = maxUnits * this.cell
    this.left = (width - this.inner) / 2
    this.right = this.left + this.inner
    this.pxPerIn = (this.cell * 1.15) / 31
    this.top = this.cell * 4
    this.total = this.top + sm.cabinLengthIn * this.pxPerIn + this.cell * 5

    let lastSection: unknown = null
    for (const row of sm.rows) {
      const layout = row.section.layout
      const unit = this.inner / units(layout)
      const seatSize = Math.min(unit * 0.86, this.cell * 1.35)
      const rowTop = this.y(row.frontIn)
      const rowH = row.pitchIn * this.pxPerIn
      const seatH = Math.min(rowH * 0.8, seatSize * 1.25)
      const seats = sm.seatsOf(row)
      let x = this.left, si = 0
      let firstAisle: number | null = null
      for (const ch of layout) {
        if (ch === '-') {
          if (firstAisle === null) firstAisle = x + (unit * 0.65) / 2
          x += unit * 0.65
          continue
        }
        const c = x + unit / 2
        this.seats.push({ seat: seats[si++], x: c - seatSize / 2, y: rowTop + rowH - seatH - rowH * 0.06, w: seatSize, h: seatH })
        x += unit
      }
      this.rowLabels.push({ row: row.number, x: firstAisle ?? width / 2, y: rowTop + rowH - seatH / 2 - rowH * 0.06, exit: row.isExit })
      if (row.section !== lastSection) {
        lastSection = row.section
        x = this.left
        for (const ch of layout) {
          if (ch === '-') { x += unit * 0.65; continue }
          this.headers.push({ text: ch, x: x + unit / 2, y: rowTop - 4 })
          x += unit
        }
      }
    }
  }

  y(inches: number) { return this.top + inches * this.pxPerIn }

  hit(px: number, py: number): Seat | null {
    const r = this.seats.find((s) => px >= s.x - 4 && px <= s.x + s.w + 4 && py >= s.y - 4 && py <= s.y + s.h + 4)
    return r?.seat ?? null
  }
}

export function drawCabin(ctx: CanvasRenderingContext2D, L: CabinLayout, selected: Seat | null, recSide: Side | null) {
  const sm = L.sm
  const ac = sm.aircraft
  const w = L.width
  const l = L.left - L.wall - 6
  const r = L.right + L.wall + 6
  const y0 = L.y(0)
  const y1 = L.y(sm.cabinLengthIn)
  ctx.clearRect(0, 0, w, L.total)

  // wings (behind the fuselage)
  const ws = L.y(sm.wingStartIn), we = L.y(sm.wingEndIn)
  const sweep = ac.propeller ? 0 : l * 0.55
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.beginPath(); ctx.moveTo(l, ws); ctx.lineTo(0, ws + sweep); ctx.lineTo(0, ws + sweep + (we - ws) * 0.35); ctx.lineTo(l, we); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(r, ws); ctx.lineTo(w, ws + sweep); ctx.lineTo(w, ws + sweep + (we - ws) * 0.35); ctx.lineTo(r, we); ctx.closePath(); ctx.fill()
  // engines
  const eng = L.y(sm.engineIn)
  const engW = l * 0.22
  for (const f of ac.engines === 4 ? [0.35, 0.72] : [0.45]) {
    const off = sweep * f
    for (const ex of [l - l * f, r + (w - r) * f]) {
      ctx.beginPath(); roundRect(ctx, ex - engW / 2, eng - 50 * L.pxPerIn + off, engW, 120 * L.pxPerIn, engW / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fill()
    }
  }
  if (ac.wing === 'HIGH') {
    ctx.font = '9px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = '#5C5C62'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    ctx.fillText('high wing (above windows)', 4, ws)
  }

  // fuselage
  const top = L.top, cell = L.cell
  ctx.beginPath()
  ctx.moveTo(l, y0)
  ctx.bezierCurveTo(l, y0 - top * 0.7, w / 2 - (r - l) * 0.1, y0 - top * 0.95, w / 2, y0 - top * 0.95)
  ctx.bezierCurveTo(w / 2 + (r - l) * 0.1, y0 - top * 0.95, r, y0 - top * 0.7, r, y0)
  ctx.lineTo(r, y1)
  ctx.bezierCurveTo(r, y1 + cell * 3, w / 2 + (r - l) * 0.08, y1 + cell * 4.6, w / 2, y1 + cell * 4.8)
  ctx.bezierCurveTo(w / 2 - (r - l) * 0.08, y1 + cell * 4.6, l, y1 + cell * 3, l, y1)
  ctx.closePath()
  ctx.fillStyle = '#16171B'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#101114'; ctx.fillRect(L.left - 4, y0, L.inner + 8, y1 - y0)

  if (recSide) {
    ctx.fillStyle = (recSide === 'LEFT' ? LEFT_COLOR : RIGHT_COLOR) + '12'
    if (recSide === 'LEFT') ctx.fillRect(L.left - 4, y0, L.inner / 2 + 4, y1 - y0)
    else ctx.fillRect(w / 2, y0, L.inner / 2 + 4, y1 - y0)
  }

  // windows on both walls
  const winH = ac.windowWidthIn * L.pxPerIn
  const winW = 3.5
  ctx.fillStyle = 'rgba(157,183,213,0.55)'
  for (const c of sm.windows) {
    const y = L.y(c)
    ctx.beginPath(); roundRect(ctx, l + 1, y - winH / 2, winW, winH, winW); ctx.fill()
    ctx.beginPath(); roundRect(ctx, r - winW - 1, y - winH / 2, winW, winH, winW); ctx.fill()
  }
  // doors
  ctx.fillStyle = 'rgba(212,185,140,0.7)'
  for (const d of sm.doorPositions) {
    const y = L.y(d)
    ctx.fillRect(l - 2, y - 18 * L.pxPerIn, 4, 36 * L.pxPerIn)
    ctx.fillRect(r - 2, y - 18 * L.pxPerIn, 4, 36 * L.pxPerIn)
  }

  // seat letters
  ctx.font = '600 10px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = '#5C5C62'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
  for (const hd of L.headers) ctx.fillText(hd.text, hd.x, hd.y)

  // seats
  for (const sr of L.seats) {
    const s = sr.seat
    const isSel = selected?.label === s.label
    const cr = sr.w * 0.22
    ctx.beginPath(); roundRect(ctx, sr.x, sr.y, sr.w, sr.h, cr)
    ctx.fillStyle = isSel ? '#F5F5F7' : CABIN_CLASS[s.row.section.cabinClass].color; ctx.fill()
    ctx.beginPath(); roundRect(ctx, sr.x, sr.y + sr.h * 0.72, sr.w, sr.h * 0.28, cr)
    ctx.fillStyle = isSel ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)'; ctx.fill()
    if (s.kind === 'WINDOW') {
      const q = sm.windowInfo(s.row).quality
      const dx = s.side === 'LEFT' ? sr.x + sr.w * 0.22 : sr.x + sr.w * 0.78
      ctx.beginPath(); ctx.arc(dx, sr.y + sr.h * 0.3, sr.w * 0.14, 0, Math.PI * 2)
      ctx.fillStyle = QUALITY[q].color; ctx.fill()
    }
    if (sm.isOverWing(s.row)) {
      ctx.beginPath(); roundRect(ctx, sr.x, sr.y, sr.w, sr.h, cr)
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke()
    }
    if (isSel) {
      ctx.beginPath(); roundRect(ctx, sr.x, sr.y, sr.w, sr.h, cr)
      ctx.strokeStyle = '#D4B98C'; ctx.lineWidth = 2; ctx.stroke()
    }
  }

  // row numbers / exit labels
  ctx.textBaseline = 'middle'
  for (const rl of L.rowLabels) {
    ctx.font = '9px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'center'
    ctx.fillStyle = rl.exit ? '#E5534B' : '#5C5C62'
    ctx.fillText(String(rl.row), rl.x, rl.y)
    if (rl.exit) {
      ctx.font = '600 8px -apple-system, Segoe UI, sans-serif'
      ctx.textAlign = 'right'; ctx.fillText('EXIT', l - 4, rl.y)
      ctx.textAlign = 'left'; ctx.fillText('EXIT', r + 4, rl.y)
    }
  }

  ctx.font = '500 10px -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = '#5C5C62'; ctx.textAlign = 'center'
  ctx.fillText('FORWARD', w / 2, y0 - top * 0.45)
}
