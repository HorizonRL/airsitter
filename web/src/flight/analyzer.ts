import { Side, sideLabel } from '../aircraft/seatMap'
import { Country, CountryIndex } from '../geo/countries'
import { EARTH_RADIUS_KM, LatLon, bearing, deg, destination, distanceKm, interpolate, normalizeAngle } from '../geo/geo'
import { SunPosition, sunPosition } from '../geo/sun'
import { airportLocation } from './airports'
import { FlightRoute } from './lookup'

export interface RouteSample {
  minute: number
  time: number
  pos: LatLon
  heading: number
  altitudeFt: number
  sun: SunPosition
  /** Sun azimuth relative to the nose: negative = left side, positive = right side. */
  sunRelative: number
  below: Country | null
  leftNear: Country | null; leftFar: Country | null
  rightNear: Country | null; rightFar: Country | null
}

export function sunSide(s: RouteSample): Side | null {
  if (s.sunRelative >= 15 && s.sunRelative <= 165) return 'RIGHT'
  if (s.sunRelative >= -165 && s.sunRelative <= -15) return 'LEFT'
  return null
}
export const groundOn = (s: RouteSample, side: Side) => (side === 'LEFT' ? s.leftNear ?? s.leftFar : s.rightNear ?? s.rightFar)
const nearOn = (s: RouteSample, side: Side) => (side === 'LEFT' ? s.leftNear : s.rightNear)

export type SunEventType = 'SUNRISE' | 'SUNSET'
export const SUN_EVENT: Record<SunEventType, { label: string; emoji: string }> = {
  SUNRISE: { label: 'Sunrise', emoji: '🌅' },
  SUNSET: { label: 'Sunset', emoji: '🌇' },
}

export interface SunEvent {
  type: SunEventType
  minute: number
  time: number
  /** Side the sun is on; null when it's straight ahead or behind. */
  side: Side | null
  pos: LatLon
}

export interface CountryVisit { country: Country; minutes: number }

export interface SideReport {
  side: Side
  sunEvents: SunEvent[]
  /** Minutes the sun shines directly into this side's windows. */
  directSunMinutes: number
  /** Minutes of warm, low sun (golden hour) on this side. */
  goldenMinutes: number
  waterPercent: number
  countries: CountryVisit[]
  /** Minutes of land visible in daylight on this side. */
  daylightLandMinutes: number
}

export type Preference = 'BEST_VIEWS' | 'SUN_EVENTS' | 'AVOID_SUN'
export const PREFERENCE: Record<Preference, { label: string; description: string }> = {
  BEST_VIEWS: { label: 'Best views', description: 'Scenery, landmarks and a nice sky' },
  SUN_EVENTS: { label: 'Sunrise / sunset', description: 'Catch the sun on the horizon' },
  AVOID_SUN: { label: 'Avoid the sun', description: 'Sleep or watch movies without glare' },
}

export interface Recommendation { side: Side | null; leftScore: number; rightScore: number; reasons: string[] }

export interface FlightAnalysis {
  route: FlightRoute
  departure: number
  arrival: number
  durationMin: number
  distanceKm: number
  samples: RouteSample[]
  left: SideReport
  right: SideReport
  daylightPercent: number
  /** Every sunrise/sunset during the flight, in order. */
  sunEvents: SunEvent[]
}

export const report = (a: FlightAnalysis, side: Side) => (side === 'LEFT' ? a.left : a.right)

export function sampleAt(a: FlightAnalysis, fraction: number): RouteSample {
  const f = Math.min(1, Math.max(0, fraction))
  return a.samples[Math.round(f * (a.samples.length - 1))]
}

export function recommend(a: FlightAnalysis, pref: Preference): Recommendation {
  const views = (r: SideReport) => r.daylightLandMinutes + 12 * r.countries.filter((c) => c.minutes >= 4).length
  const sunset = (r: SideReport) => 90 * r.sunEvents.length + r.goldenMinutes
  const glare = (r: SideReport) => r.directSunMinutes
  const score = (r: SideReport) =>
    pref === 'BEST_VIEWS' ? views(r) + 0.6 * sunset(r) - 0.15 * glare(r)
      : pref === 'SUN_EVENTS' ? sunset(r) + 0.15 * views(r)
        : -glare(r) - 0.5 * sunset(r) + 0.05 * views(r)
  const ls = score(a.left), rs = score(a.right)
  const diff = Math.abs(ls - rs)
  const scale = Math.max(1, Math.abs(ls), Math.abs(rs))
  const winner: Side | null = diff < 8 || diff / scale < 0.08 ? null : ls > rs ? 'LEFT' : 'RIGHT'
  const reasons: string[] = []
  const label = PREFERENCE[pref].label
  if (winner) {
    const w = report(a, winner)
    const o = report(a, winner === 'LEFT' ? 'RIGHT' : 'LEFT')
    const wn = sideLabel(winner).toLowerCase()
    if (w.sunEvents.length > o.sunEvents.length) {
      const names = w.sunEvents.map((e) => SUN_EVENT[e.type].label.toLowerCase()).join(' and ')
      reasons.push(`The ${names} ${w.sunEvents.length > 1 ? 'are' : 'is'} on the ${wn} side`)
    }
    if ((pref === 'AVOID_SUN' || w.directSunMinutes + 15 < o.directSunMinutes) && w.directSunMinutes < o.directSunMinutes) {
      reasons.push(`Less direct sun: ${w.directSunMinutes} min vs ${o.directSunMinutes} min`)
    }
    if (w.daylightLandMinutes > o.daylightLandMinutes + 10) {
      reasons.push(`More land in daylight: ${w.daylightLandMinutes} min vs ${o.daylightLandMinutes} min`)
    }
    if (w.waterPercent + 5 < o.waterPercent) reasons.push(`Less ocean: ${w.waterPercent}% water vs ${o.waterPercent}%`)
    if (w.goldenMinutes > o.goldenMinutes + 10 && pref !== 'AVOID_SUN') reasons.push(`Longer golden-hour light: ${w.goldenMinutes} min`)
    if (!reasons.length) reasons.push(`Slightly better overall for “${label}”`)
  } else {
    reasons.push(`Both sides are roughly equal for “${label}” — pick by window alignment and legroom.`)
    if (a.daylightPercent < 10) reasons.push('Most of the flight is in darkness.')
  }
  return { side: winner, leftScore: ls, rightScore: rs, reasons }
}

const CRUISE_KMH = 850
const CRUISE_FT = 36000
const STEP_MIN = 2
const NEAR_KM = 45
const FAR_KM = 140

export const estimateDurationMin = (km: number) => Math.round((km / CRUISE_KMH) * 60 + 30)

/** Apparent sunrise/sunset elevation for an observer at altFt (refraction + horizon dip). */
export function horizon(altFt: number): number {
  const h = altFt * 0.0003048
  return -0.83 - deg(Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + h)))
}

export function analyzeFlight(route: FlightRoute, departure: number, countries: CountryIndex): FlightAnalysis {
  const a = airportLocation(route.origin)
  const b = airportLocation(route.destination)
  const dist = distanceKm(a, b)
  const duration = estimateDurationMin(dist)
  const climb = Math.min(22, duration * 0.3)
  const descent = Math.min(28, duration * 0.35)

  const samples: RouteSample[] = []
  for (let m = 0; ; m += STEP_MIN) {
    const minute = Math.min(m, duration)
    const f = minute / duration
    const pos = interpolate(a, b, f)
    const heading = f >= 0.998
      ? bearing(interpolate(a, b, 0.996), b)
      : bearing(pos, interpolate(a, b, Math.min(1, f + 0.002)))
    const alt = minute < climb ? CRUISE_FT * (minute / climb)
      : minute > duration - descent ? CRUISE_FT * ((duration - minute) / descent) : CRUISE_FT
    const t = departure + minute * 60000
    const sun = sunPosition(t, pos)
    samples.push({
      minute, time: t, pos, heading, altitudeFt: alt, sun,
      sunRelative: normalizeAngle(sun.azimuth - heading),
      below: countries.countryAt(pos),
      leftNear: countries.countryAt(destination(pos, heading - 90, NEAR_KM)),
      leftFar: countries.countryAt(destination(pos, heading - 90, FAR_KM)),
      rightNear: countries.countryAt(destination(pos, heading + 90, NEAR_KM)),
      rightFar: countries.countryAt(destination(pos, heading + 90, FAR_KM)),
    })
    if (minute >= duration) break
  }

  // Sunrise / sunset detection with the horizon dip at altitude.
  const events: SunEvent[] = []
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i - 1], c = samples[i]
    const ep = p.sun.elevation - horizon(p.altitudeFt)
    const ec = c.sun.elevation - horizon(c.altitudeFt)
    if ((ep < 0 && ec >= 0) || (ep >= 0 && ec < 0)) {
      const k = ep / (ep - ec)
      const minute = p.minute + k * (c.minute - p.minute)
      const near = k < 0.5 ? p : c
      events.push({ type: ec >= 0 ? 'SUNRISE' : 'SUNSET', minute, time: departure + minute * 60000, side: sunSide(near), pos: near.pos })
    }
  }

  const sideReport = (side: Side): SideReport => {
    let direct = 0, golden = 0, water = 0, probes = 0, landDay = 0
    const visits = new Map<Country, number>()
    for (const s of samples) {
      const onSide = sunSide(s) === side
      const el = s.sun.elevation
      if (onSide && el > -1 && el < 55) direct += STEP_MIN
      if (onSide && el > -5 && el < 10) golden += STEP_MIN
      const near = nearOn(s, side)
      const far = side === 'LEFT' ? s.leftFar : s.rightFar
      for (const c of [near, far]) { probes++; if (!c) water++ }
      const visible = near ?? far
      if (visible && s.altitudeFt > 8000) {
        visits.set(visible, (visits.get(visible) ?? 0) + STEP_MIN)
        if (el > -4) landDay += STEP_MIN
      }
      if (far && far !== near && s.altitudeFt > 20000) visits.set(far, (visits.get(far) ?? 0) + STEP_MIN * 0.5)
    }
    return {
      side,
      sunEvents: events.filter((e) => e.side === side),
      directSunMinutes: Math.round(direct),
      goldenMinutes: Math.round(golden),
      waterPercent: probes ? Math.round((water * 100) / probes) : 0,
      countries: [...visits.entries()].map(([country, m]) => ({ country, minutes: Math.round(m) }))
        .filter((v) => v.minutes >= 2).sort((x, y) => y.minutes - x.minutes),
      daylightLandMinutes: Math.round(landDay),
    }
  }

  return {
    route, departure,
    arrival: departure + duration * 60000,
    durationMin: duration,
    distanceKm: Math.round(dist),
    samples,
    left: sideReport('LEFT'),
    right: sideReport('RIGHT'),
    daylightPercent: Math.floor((samples.filter((s) => s.sun.elevation > -2).length * 100) / Math.max(1, samples.length)),
    sunEvents: events,
  }
}
