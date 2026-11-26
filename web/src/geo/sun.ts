import { LatLon, clamp, deg, rad } from './geo'

export interface SunPosition {
  /** True azimuth, degrees clockwise from north (0..360). */
  azimuth: number
  /** Elevation above the astronomical horizon, degrees. */
  elevation: number
}

const mod = (a: number, n: number) => ((a % n) + n) % n

/** Solar position using the NOAA / Meeus low-precision algorithm (~0.1° accuracy). */
export function sunPosition(epochMs: number, at: LatLon): SunPosition {
  const jd = epochMs / 86_400_000 + 2440587.5
  const t = (jd - 2451545) / 36525

  const l0 = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360)
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const mr = rad(m)
  const c = Math.sin(mr) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mr) * (0.019993 - 0.000101 * t) + Math.sin(3 * mr) * 0.000289
  const omega = 125.04 - 1934.136 * t
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega))
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const eps = eps0 + 0.00256 * Math.cos(rad(omega))
  const decl = Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda)))

  const y = Math.tan(rad(eps / 2)) ** 2
  const l0r = rad(l0)
  const eqTime = 4 * deg(
    y * Math.sin(2 * l0r) - 2 * e * Math.sin(mr) + 4 * e * y * Math.sin(mr) * Math.cos(2 * l0r) -
      0.5 * y * y * Math.sin(4 * l0r) - 1.25 * e * e * Math.sin(2 * mr),
  )

  const utcMinutes = mod(epochMs / 1000, 86_400) / 60
  const trueSolarTime = mod(utcMinutes + eqTime + 4 * at.lon, 1440)
  const hourAngle = trueSolarTime / 4 - 180

  const latR = rad(at.lat)
  const haR = rad(hourAngle)
  const cosZenith = clamp(Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(haR), -1, 1)
  const elevation = 90 - deg(Math.acos(cosZenith))
  const az = deg(Math.atan2(Math.sin(haR), Math.cos(haR) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR))) + 180
  return { azimuth: mod(az, 360), elevation }
}
