import { useCallback, useMemo } from 'react'
import { Seat, SeatMap } from '../aircraft/seatMap'
import { FlightAnalysis } from '../flight/analyzer'
import { CountryIndex } from '../geo/countries'
import { Canvas } from './Canvas'
import { computeTracks, drawRouteMap } from './routeMap'
import { WindowScene, drawWindowView } from './windowView'

export function RouteMapView({ analysis, countries, height = 260, progress = null }: {
  analysis: FlightAnalysis; countries: CountryIndex | null; height?: number; progress?: number | null
}) {
  const tracks = useMemo(() => computeTracks(analysis), [analysis])
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => drawRouteMap(ctx, w, h, analysis, tracks, countries, progress),
    [analysis, tracks, countries, progress],
  )
  return <Canvas className="rounded" draw={draw} height={height} label={`Route map ${analysis.route.origin.iata} to ${analysis.route.destination.iata}`} />
}

export function WindowViewCanvas({ sm, seat, scene, aspect }: { sm: SeatMap; seat: Seat; scene: WindowScene; aspect: number }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => drawWindowView(ctx, w, h, sm, seat, scene),
    [sm, seat, scene.sunElevation, scene.sunX, scene.ground, scene.altitudeFt, scene.seed], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return <Canvas draw={draw} aspect={aspect} label={`View from seat ${seat.label}`} />
}
