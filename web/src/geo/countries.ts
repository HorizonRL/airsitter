import { LatLon, normalizeLon } from './geo'

/** A polygon made of rings (outer ring + holes), tested with the even-odd rule. */
export class Polygon {
  minLon: number; maxLon: number; minLat: number; maxLat: number
  constructor(public rings: Float32Array[]) {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity
    const outer = rings[0]
    for (let i = 0; i < outer.length; i += 2) {
      a = Math.min(a, outer[i]); b = Math.max(b, outer[i])
      c = Math.min(c, outer[i + 1]); d = Math.max(d, outer[i + 1])
    }
    this.minLon = a; this.maxLon = b; this.minLat = c; this.maxLat = d
  }

  contains(lon: number, lat: number): boolean {
    if (lon < this.minLon || lon > this.maxLon || lat < this.minLat || lat > this.maxLat) return false
    let inside = false
    for (const ring of this.rings) {
      const n = ring.length / 2
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = ring[2 * i], yi = ring[2 * i + 1], xj = ring[2 * j], yj = ring[2 * j + 1]
        if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
      }
    }
    return inside
  }
}

export class Country {
  readonly flag: string
  constructor(public iso2: string, public name: string, public polygons: Polygon[]) {
    this.flag = /^[A-Z]{2}$/.test(iso2)
      ? String.fromCodePoint(0x1f1e6 + iso2.charCodeAt(0) - 65, 0x1f1e6 + iso2.charCodeAt(1) - 65)
      : '🏳'
  }
  contains(lon: number, lat: number) { return this.polygons.some((p) => p.contains(lon, lat)) }
}

/**
 * World country borders (Natural Earth 1:110m, public domain).
 * Points outside every country are treated as water (ocean / sea).
 */
export class CountryIndex {
  constructor(public countries: Country[]) {}

  countryAt(p: LatLon): Country | null {
    const lon = normalizeLon(p.lon)
    return this.countries.find((c) => c.contains(lon, p.lat)) ?? null
  }

  static parse(tsv: string): CountryIndex {
    const list: Country[] = []
    for (const line of tsv.split('\n')) {
      if (!line.trim()) continue
      const parts = line.replace(/\r$/, '').split('\t')
      if (parts.length < 3) continue
      const polys = parts[2].split('|').map((poly) =>
        new Polygon(poly.split(';').map((ring) => {
          const pts = ring.split(' ')
          const arr = new Float32Array(pts.length * 2)
          pts.forEach((s, i) => {
            const k = s.indexOf(',')
            arr[2 * i] = parseFloat(s.slice(0, k))
            arr[2 * i + 1] = parseFloat(s.slice(k + 1))
          })
          return arr
        })),
      )
      list.push(new Country(parts[0], parts[1], polys))
    }
    return new CountryIndex(list)
  }
}

let loading: Promise<CountryIndex> | null = null

export function loadCountries(): Promise<CountryIndex> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}countries.tsv`)
      .then((r) => {
        if (!r.ok) throw new Error(`countries.tsv: HTTP ${r.status}`)
        return r.text()
      })
      .then(CountryIndex.parse)
    loading.catch(() => { loading = null })
  }
  return loading
}
