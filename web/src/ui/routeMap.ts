import { FlightAnalysis, SUN_EVENT } from '../flight/analyzer'
import { CountryIndex } from '../geo/countries'
import { LatLon, destination, rad } from '../geo/geo'
import { LEFT_COLOR, RIGHT_COLOR } from './color'

/** Unwraps longitudes so a path crossing the antimeridian stays continuous. */
function unwrap(points: LatLon[]): LatLon[] {
  if (!points.length) return points
  const out: LatLon[] = [points[0]]
  let prev = points[0].lon, shift = 0
  for (let i = 1; i < points.length; i++) {
    const lon = points[i].lon
    const d = lon - prev
    if (d > 180) shift -= 360
    else if (d < -180) shift += 360
    out.push({ lat: points[i].lat, lon: lon + shift })
    prev = lon
  }
  return out
}

export interface Tracks { track: LatLon[]; left: LatLon[]; right: LatLon[] }

export function computeTracks(a: FlightAnalysis): Tracks {
  const track = unwrap(a.samples.map((s) => s.pos))
  const align = (list: LatLon[]) => {
    const k = Math.round((list[0].lon - track[0].lon) / 360) * 360
    return list.map((p) => ({ lat: p.lat, lon: p.lon - k }))
  }
  return {
    track,
    left: align(unwrap(a.samples.map((s) => destination(s.pos, s.heading - 90, 140)))),
    right: align(unwrap(a.samples.map((s) => destination(s.pos, s.heading + 90, 140)))),
  }
}

export function drawRouteMap(
  ctx: CanvasRenderingContext2D, w: number, h: number, a: FlightAnalysis, tracks: Tracks,
  countries: CountryIndex | null, progress: number | null,
) {
  const { track } = tracks
  let minLat = Math.min(...track.map((p) => p.lat)), maxLat = Math.max(...track.map((p) => p.lat))
  let minLon = Math.min(...track.map((p) => p.lon)), maxLon = Math.max(...track.map((p) => p.lon))
  const padLon = Math.max(6, (maxLon - minLon) * 0.18)
  const padLat = Math.max(5, (maxLat - minLat) * 0.25)
  minLon -= padLon; maxLon += padLon
  minLat = Math.max(-85, minLat - padLat); maxLat = Math.min(85, maxLat + padLat)
  const cosPhi = Math.max(0.25, Math.cos(rad((minLat + maxLat) / 2)))
  const aspect = w / h
  const lonSpan = (maxLon - minLon) * cosPhi
  const latSpan = maxLat - minLat
  if (lonSpan / latSpan < aspect) {
    const extra = (latSpan * aspect / cosPhi - (maxLon - minLon)) / 2
    minLon -= extra; maxLon += extra
  } else {
    const extra = (lonSpan / aspect - latSpan) / 2
    minLat -= extra; maxLat += extra
  }
  const scale = Math.min(w / ((maxLon - minLon) * cosPhi), h / (maxLat - minLat))
  const ox = (w - (maxLon - minLon) * cosPhi * scale) / 2
  const oy = (h - (maxLat - minLat) * scale) / 2
  const X = (lon: number) => ox + (lon - minLon) * cosPhi * scale
  const Y = (lat: number) => oy + (maxLat - lat) * scale
  const centerLon = (minLon + maxLon) / 2

  ctx.fillStyle = '#0B0D11'; ctx.fillRect(0, 0, w, h)

  if (countries) {
    ctx.fillStyle = '#1A1C21'; ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 0.75
    for (const c of countries.countries) {
      for (const poly of c.polygons) {
        const mid = (poly.minLon + poly.maxLon) / 2
        const k = Math.round((centerLon - mid) / 360) * 360
        if (poly.maxLon + k < minLon || poly.minLon + k > maxLon) continue
        if (poly.maxLat < minLat || poly.minLat > maxLat) continue
        ctx.beginPath()
        for (const ring of poly.rings) {
          for (let i = 0; i < ring.length; i += 2) {
            const x = X(ring[i] + k), y = Y(ring[i + 1])
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.closePath()
        }
        ctx.fill('evenodd'); ctx.stroke()
      }
    }
  }

  const drawTrack = (pts: LatLon[], color: string, width: number) => {
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.lon), Y(p.lat)) : ctx.lineTo(X(p.lon), Y(p.lat))))
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
  }
  drawTrack(tracks.left, LEFT_COLOR + '40', 8)
  drawTrack(tracks.right, RIGHT_COLOR + '40', 8)
  drawTrack(track, '#F5F5F7', 1.5)

  ctx.textAlign = 'center'
  for (const e of a.sunEvents) {
    let idx = a.samples.findIndex((s) => s.minute >= e.minute)
    if (idx < 0) idx = a.samples.length - 1
    const x = X(track[idx].lon), y = Y(track[idx].lat)
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16)
    g.addColorStop(0, 'rgba(212,185,140,0.55)'); g.addColorStop(1, 'rgba(212,185,140,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#D4B98C'; ctx.fill()
    ctx.font = '500 10px -apple-system, Segoe UI, sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#D4B98C'
    ctx.fillText(SUN_EVENT[e.type].label.toUpperCase(), x, y - 9)
  }

  const airports: [LatLon, string][] = [[track[0], a.route.origin.iata], [track[track.length - 1], a.route.destination.iata]]
  for (const [p, code] of airports) {
    const x = X(p.lon), y = Y(p.lat)
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#F5F5F7'; ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(245,245,247,0.35)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.font = '600 11px -apple-system, Segoe UI, sans-serif'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3
    ctx.fillText(code, x, y + 11)
    ctx.shadowBlur = 0
  }

  if (progress !== null) {
    const idx = Math.max(0, Math.min(track.length - 1, Math.round(progress * (track.length - 1))))
    const x = X(track[idx].lon), y = Y(track[idx].lat)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rad(a.samples[idx].heading))
    drawPlane(ctx, 11); ctx.restore()
  }

  // legend
  ctx.font = '500 10px -apple-system, Segoe UI, sans-serif'; ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'; ctx.fillStyle = LEFT_COLOR; ctx.fillText('LEFT SIDE', 14, h - 14)
  ctx.textAlign = 'right'; ctx.fillStyle = RIGHT_COLOR; ctx.fillText('RIGHT SIDE', w - 14, h - 14)
}

/** A simple top-down airliner silhouette pointing up, centred at the origin. */
export function drawPlane(ctx: CanvasRenderingContext2D, s: number, color = '#fff') {
  const pts = [
    [0, -1], [0.12, -0.7], [0.12, -0.15], [1, 0.25], [1, 0.4], [0.12, 0.2], [0.1, 0.7], [0.4, 0.9], [0.4, 1], [0, 0.9],
    [-0.4, 1], [-0.4, 0.9], [-0.1, 0.7], [-0.12, 0.2], [-1, 0.4], [-1, 0.25], [-0.12, -0.15], [-0.12, -0.7],
  ]
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
  ctx.closePath()
  ctx.fillStyle = color; ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke()
}
