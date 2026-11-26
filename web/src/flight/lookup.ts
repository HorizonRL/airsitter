import { approximateZone } from '../geo/time'
import { Airport, findAirport } from './airports'

export interface FlightRoute {
  flightNumber: string
  airline: string | null
  origin: Airport
  destination: Airport
  /** Catalog id of the typical aircraft, if known. */
  typicalAircraftId: string | null
  source: string
}

type Known = [origin: string, dest: string, airline: string, aircraft: string]

const KNOWN: Record<string, Known> = {
  LY1: ['TLV', 'JFK', 'El Al', '787-9'],
  LY2: ['JFK', 'TLV', 'El Al', '787-9'],
  LY7: ['TLV', 'EWR', 'El Al', '787-9'],
  LY315: ['TLV', 'LHR', 'El Al', '787-9'],
  LY323: ['TLV', 'CDG', 'El Al', '737-800'],
  LY81: ['TLV', 'BKK', 'El Al', '787-9'],
  LY91: ['TLV', 'NRT', 'El Al', '787-9'],
  BA117: ['LHR', 'JFK', 'British Airways', '777-300ER'],
  BA15: ['LHR', 'SIN', 'British Airways', '777-300ER'],
  BA165: ['LHR', 'TLV', 'British Airways', 'A320neo'],
  AA100: ['JFK', 'LHR', 'American Airlines', '777-300ER'],
  UA1: ['SFO', 'SIN', 'United', '787-9'],
  UA90: ['EWR', 'TLV', 'United', '787-9'],
  DL1: ['JFK', 'LHR', 'Delta', '767-300ER'],
  LH400: ['FRA', 'JFK', 'Lufthansa', '747-8'],
  LH686: ['FRA', 'TLV', 'Lufthansa', 'A321neo'],
  AF6: ['CDG', 'JFK', 'Air France', '777-300ER'],
  KL641: ['AMS', 'JFK', 'KLM', '787-9'],
  EK1: ['DXB', 'LHR', 'Emirates', 'A380-800'],
  EK215: ['DXB', 'LAX', 'Emirates', 'A380-800'],
  QR1: ['DOH', 'LHR', 'Qatar Airways', 'A350-900'],
  SQ22: ['SIN', 'EWR', 'Singapore Airlines', 'A350-900'],
  SQ321: ['SIN', 'LHR', 'Singapore Airlines', 'A380-800'],
  QF1: ['SYD', 'SIN', 'Qantas', 'A380-800'],
  QF12: ['LAX', 'SYD', 'Qantas', '787-9'],
  NH10: ['NRT', 'JFK', 'ANA', '777-300ER'],
  CX888: ['HKG', 'YVR', 'Cathay Pacific', '777-300ER'],
  TK1: ['IST', 'JFK', 'Turkish Airlines', '777-300ER'],
  TK784: ['IST', 'TLV', 'Turkish Airlines', 'A321neo'],
  U22083: ['LTN', 'TLV', 'easyJet', 'A320neo'],
  FR1: ['STN', 'DUB', 'Ryanair', '737MAX8'],
  KL1009: ['AMS', 'LHR', 'KLM', 'E190'],
  AC849: ['LHR', 'YYZ', 'Air Canada', '787-9'],
  IZ271: ['TLV', 'ETM', 'Arkia', 'E195-E2'],
  EY101: ['AUH', 'JFK', 'Etihad', '787-9'],
  W62301: ['BUD', 'TLV', 'Wizz Air', 'A321neo'],
}

const IATA_TO_ICAO: Record<string, string> = {
  LY: 'ELY', BA: 'BAW', AA: 'AAL', UA: 'UAL', DL: 'DAL', LH: 'DLH', AF: 'AFR', KL: 'KLM', EK: 'UAE',
  QR: 'QTR', SQ: 'SIA', QF: 'QFA', NH: 'ANA', CX: 'CPA', TK: 'THY', U2: 'EZY', FR: 'RYR', AC: 'ACA',
  EY: 'ETD', W6: 'WZZ', IZ: 'AIZ', '6H': 'ISR', IB: 'IBE', AZ: 'ITY', LX: 'SWR', OS: 'AUA', SK: 'SAS',
  AY: 'FIN', TP: 'TAP', VS: 'VIR',
}

/** Splits "LY 001" into ["LY", 1]. */
export function parseFlightNumber(raw: string): [string, number] | null {
  const s = raw.toUpperCase().replace(/[\s-]/g, '')
  const m = /^([A-Z]{3}|[A-Z0-9]{2})(\d{1,4})$/.exec(s)
  return m ? [m[1], parseInt(m[2], 10)] : null
}

export function normalizeFlightNumber(raw: string): string {
  const p = parseFlightNumber(raw)
  return p ? `${p[0]}${p[1]}` : raw.toUpperCase().replace(/\s/g, '')
}

/**
 * Resolves a flight number to a route.
 * 1. Bundled list of well-known flights (includes the typical aircraft).
 * 2. The free adsbdb.com callsign database (route only).
 */
export async function lookupFlight(raw: string): Promise<FlightRoute | null> {
  const norm = normalizeFlightNumber(raw)
  const k = KNOWN[norm]
  if (k) {
    const o = findAirport(k[0]), d = findAirport(k[1])
    if (o && d) return { flightNumber: norm, airline: k[2], origin: o, destination: d, typicalAircraftId: k[3], source: 'AirSitter database' }
  }
  const parsed = parseFlightNumber(raw)
  const candidates = new Set<string>([norm])
  if (parsed) {
    const icao = IATA_TO_ICAO[parsed[0]]
    if (icao) {
      candidates.add(`${icao}${parsed[1]}`)
      candidates.add(`${icao}${String(parsed[1]).padStart(3, '0')}`)
    }
    candidates.add(`${parsed[0]}${String(parsed[1]).padStart(3, '0')}`)
  }
  for (const c of candidates) {
    try {
      const r = await queryAdsbdb(c, norm)
      if (r) return r
    } catch { /* try the next form */ }
  }
  return null
}

interface AdsbAirport {
  iata_code?: string; icao_code?: string; name?: string; municipality?: string; latitude: number; longitude: number
}

async function queryAdsbdb(callsign: string, display: string): Promise<FlightRoute | null> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 6000)
  try {
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`, { signal: ctl.signal })
    if (!res.ok) return null
    const fr = (await res.json())?.response?.flightroute
    if (!fr?.origin || !fr?.destination) return null
    return {
      flightNumber: display,
      airline: fr.airline?.name ?? null,
      origin: toAirport(fr.origin),
      destination: toAirport(fr.destination),
      typicalAircraftId: null,
      source: 'adsbdb.com',
    }
  } finally {
    clearTimeout(timer)
  }
}

function toAirport(j: AdsbAirport): Airport {
  const known = findAirport(j.iata_code)
  if (known) return known
  return {
    iata: j.iata_code || j.icao_code || '???',
    name: j.name ?? '',
    city: j.municipality || j.name || '',
    lat: j.latitude, lon: j.longitude,
    zone: approximateZone(j.longitude),
  }
}
