import { AircraftModel, CabinSection } from './aircraft'

export type Side = 'LEFT' | 'RIGHT'
export const sideLabel = (s: Side) => (s === 'LEFT' ? 'Left' : 'Right')
export const otherSide = (s: Side): Side => (s === 'LEFT' ? 'RIGHT' : 'LEFT')

export type SeatKind = 'WINDOW' | 'MIDDLE' | 'AISLE'
export const kindLabel = (k: SeatKind) => ({ WINDOW: 'Window', MIDDLE: 'Middle', AISLE: 'Aisle' })[k]

export type WindowQuality = 'PERFECT' | 'GOOD' | 'POOR' | 'NONE'
export const QUALITY: Record<WindowQuality, { label: string; detail: string; color: string }> = {
  PERFECT: { label: 'Perfect window', detail: 'A window sits right next to your head.', color: '#30D158' },
  GOOD: { label: 'Good window', detail: 'The window is slightly offset — a small lean gives a full view.', color: '#E5D07A' },
  POOR: { label: 'Between windows', detail: 'Your head lines up with the wall between two windows.', color: '#E0913F' },
  NONE: { label: 'No window', detail: 'There is no window at this row — just wall.', color: '#E5534B' },
}

export interface Row {
  number: number
  section: CabinSection
  /** Position of the front of the row space, inches from the cabin front. */
  frontIn: number
  pitchIn: number
  isExit: boolean
  /** Approximate eye position of a seated passenger. */
  eyeIn: number
}

export interface Seat {
  row: Row
  letter: string
  /** Column index within the row (0 = leftmost). */
  column: number
  kind: SeatKind
  /** The side whose window this seat looks out of. */
  side: Side
  /** Number of seats between this seat and its wall. */
  seatsFromWall: number
  aislesFromWall: number
  label: string
}

export interface RowWindowInfo {
  quality: WindowQuality
  /** Nearest window centre minus eye position, inches. Positive = window is behind the eye. */
  offsetIn: number
  windowsInRow: number
}

/** A concrete, positioned cabin generated from an AircraftModel. */
export class SeatMap {
  readonly rows: Row[] = []
  readonly windows: number[] = []
  readonly doorPositions: number[] = []
  readonly cabinLengthIn: number
  readonly wingStartIn: number
  readonly wingEndIn: number
  readonly engineIn: number

  constructor(public readonly aircraft: AircraftModel) {
    const skip = new Set(aircraft.skipRows ?? [])
    const exits = new Set(aircraft.exitRows ?? [])
    let pos = 40
    this.doorPositions.push(20)
    for (const s of aircraft.sections) {
      if (s.doorBefore) this.doorPositions.push(pos + s.gapBeforeIn / 2)
      pos += s.gapBeforeIn
      for (let r = s.firstRow; r <= s.lastRow; r++) {
        if (skip.has(r)) continue
        const isExit = exits.has(r)
        const pitch = s.pitchIn + (isExit ? 12 : 0)
        this.rows.push({ number: r, section: s, frontIn: pos, pitchIn: pitch, isExit, eyeIn: pos + pitch - 11 })
        pos += pitch
      }
    }
    this.cabinLengthIn = pos + 40
    this.doorPositions.push(this.cabinLengthIn - 20)
    this.wingStartIn = this.cabinLengthIn * aircraft.wingStartFrac
    this.wingEndIn = this.cabinLengthIn * aircraft.wingEndFrac
    this.engineIn = this.cabinLengthIn * aircraft.engineFrac

    const w: number[] = []
    for (let c = aircraft.windowPitchIn * 0.75; c < this.cabinLengthIn - 10; c += aircraft.windowPitchIn) {
      if (!this.doorPositions.some((d) => Math.abs(d - c) < 24)) w.push(c)
    }
    for (const missing of aircraft.missingWindowRows ?? []) {
      const row = this.rows.find((r) => r.number === missing)
      if (!row) continue
      let best = -1
      w.forEach((c, i) => { if (best < 0 || Math.abs(c - row.eyeIn) < Math.abs(w[best] - row.eyeIn)) best = i })
      if (best >= 0) w.splice(best, 1)
    }
    this.windows = w
  }

  seatsOf(row: Row): Seat[] {
    const layout = row.section.layout
    const letters = layout.replace(/-/g, '')
    const n = letters.length
    return [...letters].map((ch, i) => {
      const ci = layout.indexOf(ch)
      const side: Side = ci <= (layout.length - 1) / 2 ? 'LEFT' : 'RIGHT'
      const fromWall = side === 'LEFT' ? i : n - 1 - i
      const aisles = side === 'LEFT'
        ? [...layout.slice(0, ci)].filter((c) => c === '-').length
        : [...layout.slice(ci)].filter((c) => c === '-').length
      const kind: SeatKind = i === 0 || i === n - 1 ? 'WINDOW'
        : layout[ci - 1] === '-' || layout[ci + 1] === '-' ? 'AISLE' : 'MIDDLE'
      return { row, letter: ch, column: i, kind, side, seatsFromWall: fromWall, aislesFromWall: aisles, label: `${row.number}${ch}` }
    })
  }

  windowInfo(row: Row): RowWindowInfo {
    const eye = row.eyeIn
    const inRow = this.windows.filter((c) => c >= row.frontIn && c < row.frontIn + row.pitchIn).length
    if (this.windows.length === 0) return { quality: 'NONE', offsetIn: 0, windowsInRow: 0 }
    const nearest = this.windows.reduce((a, b) => (Math.abs(b - eye) < Math.abs(a - eye) ? b : a))
    const d = nearest - eye
    const half = this.aircraft.windowWidthIn / 2
    const quality: WindowQuality =
      Math.abs(d) > half + 7 ? 'NONE'
        : Math.abs(d) <= half * 0.55 ? 'PERFECT'
          : Math.abs(d) <= half + 1 ? 'GOOD' : 'POOR'
    return { quality, offsetIn: d, windowsInRow: inRow }
  }

  /** Windows near eyeIn, as offsets (window centre − eye) in inches. */
  windowOffsetsNear(eyeIn: number, rangeIn = 70): number[] {
    return this.windows.map((c) => c - eyeIn).filter((o) => Math.abs(o) <= rangeIn)
  }

  isOverWing(row: Row) { return row.eyeIn >= this.wingStartIn && row.eyeIn <= this.wingEndIn }
  isNearEngine(row: Row) { return Math.abs(row.eyeIn - this.engineIn) < 60 }
  /** Rows just behind the engines/props are the noisiest. */
  isNoisy(row: Row) { const d = row.eyeIn - this.engineIn; return d >= 0 && d <= 140 }
  isBulkhead(row: Row) { return this.rows.find((r) => r.section === row.section) === row }

  /** Seats directly in front of an exit row often cannot recline. */
  limitedRecline(row: Row): boolean {
    const idx = this.rows.indexOf(row)
    const next = this.rows[idx + 1]
    return (next !== undefined && next.isExit && next.section === row.section && !row.isExit) || idx === this.rows.length - 1
  }
}
