import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CABIN_CLASS, displayName, seatCount } from '../aircraft/aircraft'
import { QUALITY, Seat, SeatMap, Side, WindowQuality, kindLabel, sideLabel } from '../aircraft/seatMap'
import { FlightAnalysis, PREFERENCE, SUN_EVENT, recommend, report, sampleAt } from '../flight/analyzer'
import { formatMinutes } from '../geo/time'
import { useApp } from '../state'
import { CabinLayout, drawCabin } from './cabinMap'
import { Canvas } from './Canvas'
import { sideColor } from './color'
import { AppBar } from './Common'
import { Icon } from './Icon'
import { WindowViewCanvas } from './Views'
import { WindowScene, sceneFrom } from './windowView'

export function SeatsScreen() {
  const { state, actions } = useApp()
  const sm = state.seatMap!
  const a = state.analysis
  const recSide = a ? recommend(a, state.preference).side : null
  const seat = state.selectedSeat
  const [width, setWidth] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => (width > 0 ? new CabinLayout(sm, width) : null), [sm, width])
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => { if (layout) drawCabin(ctx, layout, seat, recSide) },
    [layout, seat, recSide],
  )

  return (
    <div className="screen">
      <AppBar
        title={displayName(sm.aircraft)}
        subtitle={a ? `${a.route.flightNumber} · ${a.route.origin.iata} – ${a.route.destination.iata}` : `${seatCount(sm.aircraft)} seats · typical layout`}
        onBack={actions.back}
      />
      <main className="page seats-page">
        <div className="seats-main">
          {recSide && (
            <div className="eyebrow" style={{ color: sideColor(recSide) }}>
              Recommended · {sideLabel(recSide)} side for {PREFERENCE[state.preference].label.toLowerCase()}
            </div>
          )}
          <div className="legend">
            {(Object.keys(QUALITY) as WindowQuality[]).map((q) => <LegendDot key={q} color={QUALITY[q].color} label={QUALITY[q].label} />)}
            <LegendDot color="#E5534B" label="Exit row" />
          </div>
          {sm.aircraft.note && <p className="muted small">{sm.aircraft.note}</p>}
          <div ref={box} className="cabin">
            {layout && (
              <Canvas
                draw={draw}
                height={layout.total}
                label="Cabin seat map"
                onClick={(x, y) => { const s = layout.hit(x, y); if (s) actions.set({ selectedSeat: s }) }}
              />
            )}
          </div>
        </div>
        <aside className={`seat-panel${seat ? ' open' : ''}`}>
          {seat ? (
            <SeatDetails sm={sm} seat={seat} analysis={a} recSide={recSide} />
          ) : (
            <div className="placeholder">
              <Icon name="seat" size={28} />
              <span>Select a seat to preview its window.</span>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="legend-dot"><i style={{ background: color }} />{label}</span>
}

function SeatDetails({ sm, seat, analysis, recSide }: { sm: SeatMap; seat: Seat; analysis: FlightAnalysis | null; recSide: Side | null }) {
  const { state, actions } = useApp()
  const info = sm.windowInfo(seat.row)
  const scene: WindowScene = analysis
    ? sceneFrom(sampleAt(analysis, state.progress), seat.side, seat.row.number)
    : { sunElevation: state.demoSunElevation, sunX: 20, ground: state.demoWater ? 'WATER' : 'LAND', altitudeFt: 36000, seed: seat.row.number }
  const cls = CABIN_CLASS[seat.row.section.cabinClass]
  const plural = seat.seatsFromWall > 1 ? 's' : ''

  const tags: [string, string][] = []
  if (seat.kind === 'WINDOW') tags.push([QUALITY[info.quality].label, QUALITY[info.quality].color])
  else tags.push([`Window ${seat.seatsFromWall} seat${plural} away`, '#E0913F'])
  if (sm.isOverWing(seat.row)) tags.push([sm.aircraft.wing === 'HIGH' ? 'Wing above window' : 'Over the wing', '#8E8E93'])
  if (seat.row.isExit) tags.push(['Exit row legroom', '#30D158'])
  if (sm.isBulkhead(seat.row)) tags.push(['Bulkhead', '#9DB7D5'])
  if (sm.isNoisy(seat.row)) tags.push(['Engine noise', '#E0913F'])
  if (sm.limitedRecline(seat.row)) tags.push(['Limited recline', '#E5534B'])

  return (
    <div className="seat-details">
      <button type="button" className="icon-btn close-panel" onClick={() => actions.set({ selectedSeat: null })} aria-label="Close"><Icon name="close" size={16} /></button>
      <span className="eyebrow">{cls.label}{recSide === seat.side ? ' · Recommended side' : ''}</span>
      <div className="seat-title">
        <h2>{seat.label}</h2>
        <span className="muted">{kindLabel(seat.kind)} · {sideLabel(seat.side)} · {seat.row.pitchIn}″ pitch</span>
      </div>
      <div className="rounded">
        <WindowViewCanvas sm={sm} seat={seat} scene={scene} aspect={1.6} />
      </div>
      <div className="tags">
        {tags.map(([t, c]) => <span key={t} className="tag"><i style={{ background: c }} />{t}</span>)}
      </div>
      <p className="muted small">
        {seat.kind === 'WINDOW' ? QUALITY[info.quality].detail
          : `You'll be looking past ${seat.seatsFromWall} neighbour${plural} to the ${sideLabel(seat.side).toLowerCase()} window.`}
      </p>
      {analysis && (() => {
        const rep = report(analysis, seat.side)
        return (
          <div className="facts">
            <div className="metric"><span className="k"><Icon name="sunrise" size={16} />Sun events</span>
              <span className="val">{rep.sunEvents.length ? rep.sunEvents.map((e) => SUN_EVENT[e.type].label).join(', ') : <span className="faint">None</span>}</span></div>
            <div className="metric"><span className="k"><Icon name="sun" size={16} />Direct sun</span><span className="val">{formatMinutes(rep.directSunMinutes)}</span></div>
            <div className="metric"><span className="k"><Icon name="water" size={16} />Over water</span><span className="val">{rep.waterPercent}%</span></div>
          </div>
        )
      })()}
      <button type="button" className="primary block" onClick={() => actions.navigate('window')}>
        <Icon name="orbit" size={18} /> Sit here · 360° view
      </button>
    </div>
  )
}
