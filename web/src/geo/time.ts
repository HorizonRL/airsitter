/** Time-zone helpers on top of Intl (IANA names, or "Etc/GMT±N" for estimated zones). */

const fmtCache = new Map<string, Intl.DateTimeFormat>()

function parts(zone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(zone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    fmtCache.set(zone, f)
  }
  return f
}

/** Offset of zone from UTC at the given instant, in minutes. */
export function zoneOffsetMin(epochMs: number, zone: string): number {
  const p: Record<string, number> = {}
  for (const x of parts(zone).formatToParts(new Date(epochMs))) if (x.type !== 'literal') p[x.type] = +x.value
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second)
  return Math.round((asUtc - Math.floor(epochMs / 1000) * 1000) / 60000)
}

/** Converts a wall-clock date ("2026-11-26") and time ("06:00") in zone to an epoch millisecond. */
export function zonedToEpoch(date: string, time: string, zone: string): number {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const naive = Date.UTC(y, mo - 1, d, h, mi)
  let t = naive - zoneOffsetMin(naive, zone) * 60000
  t = naive - zoneOffsetMin(t, zone) * 60000
  return t
}

/** Estimated zone for airports outside the bundled list. */
export function approximateZone(lon: number): string {
  const h = Math.max(-12, Math.min(14, Math.round(lon / 15)))
  if (h === 0) return 'UTC'
  // Etc/GMT signs are inverted: Etc/GMT-3 is UTC+3.
  return `Etc/GMT${h > 0 ? '-' : '+'}${Math.abs(h)}`
}

export function formatTime(epochMs: number, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(epochMs))
}

export function formatDateTime(epochMs: number, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(epochMs))
}

export function formatMinutes(min: number): string {
  const m = Math.round(min)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
