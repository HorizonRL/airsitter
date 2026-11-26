export interface LatLon { lat: number; lon: number }

export const EARTH_RADIUS_KM = 6371

export const rad = (d: number) => (d * Math.PI) / 180
export const deg = (r: number) => (r * 180) / Math.PI
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

export function normalizeLon(lon: number): number {
  let l = (lon + 180) % 360
  if (l < 0) l += 360
  return l - 180
}

/** Normalizes an angle to (-180, 180]. */
export function normalizeAngle(a: number): number {
  let x = a % 360
  if (x <= -180) x += 360
  if (x > 180) x -= 360
  return x
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(clamp(h, 0, 1)))
}

/** Initial true bearing from a to b, 0..360. */
export function bearing(a: LatLon, b: LatLon): number {
  const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon)
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

/** Point at fraction (0..1) along the great circle from a to b. */
export function interpolate(a: LatLon, b: LatLon, f: number): LatLon {
  const p1 = rad(a.lat), l1 = rad(a.lon), p2 = rad(b.lat), l2 = rad(b.lon)
  const d = distanceKm(a, b) / EARTH_RADIUS_KM
  if (d < 1e-9) return a
  const s = Math.sin(d)
  const f1 = Math.sin((1 - f) * d) / s
  const f2 = Math.sin(f * d) / s
  const x = f1 * Math.cos(p1) * Math.cos(l1) + f2 * Math.cos(p2) * Math.cos(l2)
  const y = f1 * Math.cos(p1) * Math.sin(l1) + f2 * Math.cos(p2) * Math.sin(l2)
  const z = f1 * Math.sin(p1) + f2 * Math.sin(p2)
  return { lat: deg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: deg(Math.atan2(y, x)) }
}

/** Destination from start travelling distKm on initial bearing. */
export function destination(start: LatLon, bearingDeg: number, distKm: number): LatLon {
  const d = distKm / EARTH_RADIUS_KM
  const b = rad(bearingDeg)
  const p1 = rad(start.lat), l1 = rad(start.lon)
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b))
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))
  return { lat: deg(p2), lon: normalizeLon(deg(l2)) }
}
