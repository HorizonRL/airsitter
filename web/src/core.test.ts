import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AIRCRAFT } from './aircraft/aircraft'
import { SeatMap } from './aircraft/seatMap'
import { findAirport } from './flight/airports'
import { analyzeFlight, recommend } from './flight/analyzer'
import { lookupFlight, normalizeFlightNumber } from './flight/lookup'
import { CountryIndex } from './geo/countries'
import { distanceKm } from './geo/geo'
import { sunPosition } from './geo/sun'
import { zonedToEpoch } from './geo/time'

describe('geo', () => {
  it('LHR–JFK distance', () => {
    expect(Math.abs(distanceKm({ lat: 51.47, lon: -0.454 }, { lat: 40.64, lon: -73.779 }) - 5540)).toBeLessThan(30)
  })
  it('noon sun in Tel Aviv at the solstice is high', () => {
    const s = sunPosition(zonedToEpoch('2026-06-21', '12:40', 'Asia/Jerusalem'), { lat: 32.08, lon: 34.78 })
    expect(s.elevation).toBeGreaterThan(78)
  })
  it('equinox sunset in London is due west', () => {
    const s = sunPosition(zonedToEpoch('2026-03-20', '18:00', 'Europe/London'), { lat: 51.5, lon: 0 })
    expect(Math.abs(s.azimuth - 270)).toBeLessThan(6)
    expect(Math.abs(s.elevation)).toBeLessThan(3)
  })
  it('converts local time with DST', () => {
    expect(new Date(zonedToEpoch('2026-07-01', '12:00', 'Europe/London')).toISOString()).toBe('2026-07-01T11:00:00.000Z')
    expect(new Date(zonedToEpoch('2026-11-26', '06:00', 'Asia/Jerusalem')).toISOString()).toBe('2026-11-26T04:00:00.000Z')
  })
})

describe('flights', () => {
  it('normalizes flight numbers', () => {
    expect(normalizeFlightNumber('ly 001')).toBe('LY1')
    expect(normalizeFlightNumber('U2 2083')).toBe('U22083')
    expect(normalizeFlightNumber('6H123')).toBe('6H123')
  })
  it('analyzes LY1 TLV→JFK at dawn: sun on the left, right side recommended', async () => {
    const countries = CountryIndex.parse(readFileSync('public/countries.tsv', 'utf8'))
    const route = (await lookupFlight('LY1'))!
    expect(route.origin).toBe(findAirport('TLV'))
    const a = analyzeFlight(route, zonedToEpoch('2026-11-26', '06:00', route.origin.zone), countries)
    expect(a.left.directSunMinutes).toBeGreaterThan(300)
    expect(a.right.directSunMinutes).toBeLessThan(a.left.directSunMinutes)
    expect(a.left.countries.length + a.right.countries.length).toBeGreaterThan(3)
    expect(recommend(a, 'AVOID_SUN').side).toBe('RIGHT')
  })
})

describe('seat maps', () => {
  it('every aircraft builds with windows and window seats on both walls', () => {
    for (const m of AIRCRAFT) {
      const sm = new SeatMap(m)
      expect(sm.rows.length, m.id).toBeGreaterThan(0)
      expect(sm.windows.length, m.id).toBeGreaterThan(0)
      for (const r of sm.rows) {
        const seats = sm.seatsOf(r)
        expect(seats[0].kind).toBe('WINDOW')
        expect(seats[seats.length - 1].kind).toBe('WINDOW')
        expect(seats[0].side).toBe('LEFT')
        expect(seats[seats.length - 1].side).toBe('RIGHT')
        sm.windowInfo(r)
      }
    }
  })
  it('A320neo row 10 has no window', () => {
    const sm = new SeatMap(AIRCRAFT.find((m) => m.id === 'A320neo')!)
    expect(sm.windowInfo(sm.rows.find((r) => r.number === 10)!).quality).toBe('NONE')
  })
})
