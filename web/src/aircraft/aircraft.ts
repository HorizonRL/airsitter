export type CabinClass = 'FIRST' | 'BUSINESS' | 'PREMIUM' | 'ECONOMY'

export const CABIN_CLASS: Record<CabinClass, { label: string; color: string }> = {
  FIRST: { label: 'First', color: '#6B5A43' },
  BUSINESS: { label: 'Business', color: '#4A4F5C' },
  PREMIUM: { label: 'Premium Economy', color: '#3E4652' },
  ECONOMY: { label: 'Economy', color: '#2E3138' },
}

export type WingType = 'LOW' | 'HIGH'

/** One cabin zone. layout lists seat letters left-to-right (looking forward); '-' marks an aisle. */
export interface CabinSection {
  cabinClass: CabinClass
  firstRow: number
  lastRow: number
  layout: string
  pitchIn: number
  seatWidthIn: number
  /** Galley / lavatory / door space before this section, inches. */
  gapBeforeIn: number
  /** Whether a passenger door sits in the gap (no window there). */
  doorBefore: boolean
}

export interface AircraftModel {
  id: string
  vendor: string
  model: string
  widebody: boolean
  wing: WingType
  /** Distance between window centres along the fuselage, inches. */
  windowPitchIn: number
  windowWidthIn: number
  windowHeightIn: number
  /** Wing root extent and engine position as a fraction of cabin length (0 = front). */
  wingStartFrac: number
  wingEndFrac: number
  engineFrac: number
  engines: number
  propeller?: boolean
  sections: CabinSection[]
  exitRows?: number[]
  /** Rows known to have no window next to them (ducts, structure). */
  missingWindowRows?: number[]
  skipRows?: number[]
  note?: string
}

const Y: CabinClass = 'ECONOMY', J: CabinClass = 'BUSINESS', W: CabinClass = 'PREMIUM', F: CabinClass = 'FIRST'

const sec = (
  cabinClass: CabinClass, firstRow: number, lastRow: number, layout: string, pitchIn: number, seatWidthIn: number,
  gapBeforeIn = 0, doorBefore = false,
): CabinSection => ({ cabinClass, firstRow, lastRow, layout, pitchIn, seatWidthIn, gapBeforeIn, doorBefore })

export const AIRCRAFT: AircraftModel[] = [
  {
     id: "A220-300", vendor: "Airbus", model: "A220-300", widebody: false, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 11.0, windowHeightIn: 16.0,
     wingStartFrac: 0.38, wingEndFrac: 0.60, engineFrac: 0.40, engines: 2,
     sections: [
         sec(J, 1, 3, "AC-DF", 36, 20.0),
         sec(Y, 4, 30, "AC-DEF", 31, 18.5, 6),
     ],
     exitRows: [12], note: "2-3 economy: only one middle seat per row (E).",
  },
  {
     id: "A320neo", vendor: "Airbus", model: "A320neo", widebody: false, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 9.0, windowHeightIn: 13.0,
     wingStartFrac: 0.36, wingEndFrac: 0.58, engineFrac: 0.38, engines: 2,
     sections: [
         sec(J, 1, 3, "AC-DF", 34, 21.0),
         sec(Y, 4, 30, "ABC-DEF", 30, 18.0, 4),
     ],
     exitRows: [11, 12], missingWindowRows: [10],
  },
  {
     id: "A321neo", vendor: "Airbus", model: "A321neo", widebody: false, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 9.0, windowHeightIn: 13.0,
     wingStartFrac: 0.42, wingEndFrac: 0.60, engineFrac: 0.44, engines: 2,
     sections: [
         sec(J, 1, 4, "AC-DF", 38, 21.0),
         sec(Y, 5, 38, "ABC-DEF", 30, 18.0, 30, true),
     ],
     exitRows: [5, 20], missingWindowRows: [19],
  },
  {
     id: "A330-300", vendor: "Airbus", model: "A330-300", widebody: true, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 9.0, windowHeightIn: 13.0,
     wingStartFrac: 0.40, wingEndFrac: 0.60, engineFrac: 0.43, engines: 2,
     sections: [
         sec(J, 1, 7, "AC-DG-HK", 60, 21.0),
         sec(Y, 10, 46, "AC-DEFG-HK", 31, 18.0, 60, true),
     ],
     exitRows: [10, 30],
  },
  {
     id: "A350-900", vendor: "Airbus", model: "A350-900", widebody: true, wing: "LOW",
     windowPitchIn: 22.0, windowWidthIn: 9.5, windowHeightIn: 14.0,
     wingStartFrac: 0.42, wingEndFrac: 0.62, engineFrac: 0.45, engines: 2,
     sections: [
         sec(J, 1, 9, "A-DG-K", 44, 22.0),
         sec(W, 11, 14, "AC-DEFG-HK", 38, 19.0, 60, true),
         sec(Y, 20, 48, "ABC-DEF-GHK", 31, 18.0, 50, true),
     ],
     exitRows: [20, 32], note: "Large windows; electrically dimmable shades on some operators.",
  },
  {
     id: "A380-800", vendor: "Airbus", model: "A380-800 (main deck)", widebody: true, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 10.0, windowHeightIn: 15.0,
     wingStartFrac: 0.38, wingEndFrac: 0.64, engineFrac: 0.40, engines: 4,
     sections: [
         sec(F, 1, 4, "A-E-K", 80, 30.0),
         sec(Y, 40, 54, "ABC-DEFG-HJK", 32, 18.0, 70, true),
         sec(Y, 55, 88, "ABC-DEFG-HJK", 32, 18.0, 50, true),
     ],
     exitRows: [40, 55, 70], note: "Upper deck not shown. Main deck windows have a deep wall recess.",
  },
  {
     id: "737-800", vendor: "Boeing", model: "737-800", widebody: false, wing: "LOW",
     windowPitchIn: 20.0, windowWidthIn: 10.0, windowHeightIn: 14.0,
     wingStartFrac: 0.36, wingEndFrac: 0.60, engineFrac: 0.38, engines: 2,
     sections: [
         sec(J, 1, 4, "AC-DF", 38, 21.0),
         sec(Y, 7, 33, "ABC-DEF", 30, 17.0, 6),
     ],
     exitRows: [16, 17], missingWindowRows: [11],
  },
  {
     id: "737MAX8", vendor: "Boeing", model: "737 MAX 8", widebody: false, wing: "LOW",
     windowPitchIn: 20.0, windowWidthIn: 10.0, windowHeightIn: 14.0,
     wingStartFrac: 0.36, wingEndFrac: 0.60, engineFrac: 0.37, engines: 2,
     sections: [
         sec(J, 1, 4, "AC-DF", 37, 21.0),
         sec(W, 6, 8, "ABC-DEF", 34, 17.0, 6),
         sec(Y, 9, 32, "ABC-DEF", 30, 17.0),
     ],
     exitRows: [15, 16], missingWindowRows: [10],
  },
  {
     id: "757-200", vendor: "Boeing", model: "757-200", widebody: false, wing: "LOW",
     windowPitchIn: 20.0, windowWidthIn: 10.0, windowHeightIn: 14.0,
     wingStartFrac: 0.40, wingEndFrac: 0.60, engineFrac: 0.42, engines: 2,
     sections: [
         sec(J, 1, 4, "AC-DF", 50, 21.0),
         sec(Y, 8, 38, "ABC-DEF", 31, 17.2, 36, true),
     ],
     exitRows: [8, 22],
  },
  {
     id: "767-300ER", vendor: "Boeing", model: "767-300ER", widebody: true, wing: "LOW",
     windowPitchIn: 20.0, windowWidthIn: 10.0, windowHeightIn: 14.0,
     wingStartFrac: 0.40, wingEndFrac: 0.60, engineFrac: 0.42, engines: 2,
     sections: [
         sec(J, 1, 8, "A-DF-K", 46, 21.0),
         sec(Y, 20, 44, "AC-DEF-HK", 31, 17.5, 60, true),
     ],
     exitRows: [20, 28],
  },
  {
     id: "777-300ER", vendor: "Boeing", model: "777-300ER", widebody: true, wing: "LOW",
     windowPitchIn: 20.0, windowWidthIn: 10.0, windowHeightIn: 15.0,
     wingStartFrac: 0.40, wingEndFrac: 0.60, engineFrac: 0.42, engines: 2,
     sections: [
         sec(F, 1, 2, "A-E-K", 80, 30.0),
         sec(J, 5, 14, "A-DG-K", 44, 22.0, 60, true),
         sec(W, 20, 24, "AB-DEFG-JK", 38, 18.5, 50, true),
         sec(Y, 30, 60, "ABC-DEFG-HJK", 31, 17.0, 50, true),
     ],
     exitRows: [30, 45],
  },
  {
     id: "787-9", vendor: "Boeing", model: "787-9 Dreamliner", widebody: true, wing: "LOW",
     windowPitchIn: 19.0, windowWidthIn: 10.7, windowHeightIn: 18.4,
     wingStartFrac: 0.40, wingEndFrac: 0.60, engineFrac: 0.43, engines: 2,
     sections: [
         sec(J, 1, 8, "A-DG-L", 44, 21.0),
         sec(W, 20, 23, "AC-DEF-HL", 38, 18.5, 60, true),
         sec(Y, 30, 52, "ABC-DEF-HJL", 31, 17.3, 50, true),
     ],
     exitRows: [30, 40],
     note: "Largest windows of any airliner, with electrochromic dimming instead of shades.",
  },
  {
     id: "747-8", vendor: "Boeing", model: "747-8I (main deck)", widebody: true, wing: "LOW",
     windowPitchIn: 20.0, windowWidthIn: 10.0, windowHeightIn: 15.0,
     wingStartFrac: 0.42, wingEndFrac: 0.64, engineFrac: 0.44, engines: 4,
     sections: [
         sec(F, 1, 2, "A-K", 80, 30.0),
         sec(J, 3, 10, "A-DG-K", 46, 22.0, 40, true),
         sec(W, 20, 24, "AB-DEFG-JK", 38, 18.5, 50, true),
         sec(Y, 30, 66, "ABC-DEFG-HJK", 31, 17.2, 50, true),
     ],
     exitRows: [30, 46], note: "Upper deck not shown.",
  },
  {
     id: "E190", vendor: "Embraer", model: "E190", widebody: false, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 10.5, windowHeightIn: 15.0,
     wingStartFrac: 0.38, wingEndFrac: 0.62, engineFrac: 0.40, engines: 2,
     sections: [
         sec(J, 1, 3, "AC-D", 38, 20.0),
         sec(Y, 4, 26, "AC-DF", 31, 18.3, 6),
     ],
     exitRows: [12, 13], note: "No middle seats on this jet.",
  },
  {
     id: "E195-E2", vendor: "Embraer", model: "E195-E2", widebody: false, wing: "LOW",
     windowPitchIn: 21.0, windowWidthIn: 10.5, windowHeightIn: 15.0,
     wingStartFrac: 0.40, wingEndFrac: 0.62, engineFrac: 0.42, engines: 2,
     sections: [
         sec(J, 1, 3, "AC-DF", 38, 20.0),
         sec(Y, 4, 32, "AC-DF", 31, 18.3, 6),
     ],
     exitRows: [14, 15], note: "No middle seats on this jet.",
  },
  {
     id: "ATR72-600", vendor: "ATR", model: "72-600", widebody: false, wing: "HIGH",
     windowPitchIn: 20.0, windowWidthIn: 9.0, windowHeightIn: 12.0,
     wingStartFrac: 0.22, wingEndFrac: 0.48, engineFrac: 0.26, engines: 2, propeller: true,
     sections: [sec(Y, 1, 18, "AC-DF", 29, 18.0)],
     exitRows: [1], note: "High wing: the wing is ABOVE the window, so the ground stays visible. Propeller noise is loudest in rows 3-6.",
  },
]

export const displayName = (m: AircraftModel) => `${m.vendor} ${m.model}`

export function seatCount(m: AircraftModel): number {
  const skip = new Set(m.skipRows ?? [])
  return m.sections.reduce((sum, s) => {
    let rows = 0
    for (let r = s.firstRow; r <= s.lastRow; r++) if (!skip.has(r)) rows++
    return sum + rows * s.layout.replace(/-/g, '').length
  }, 0)
}

export const VENDORS = [...new Set(AIRCRAFT.map((m) => m.vendor))]

export function aircraftById(id: string | null | undefined): AircraftModel | undefined {
  if (!id) return undefined
  return AIRCRAFT.find((m) => m.id.toLowerCase() === id.toLowerCase())
}
