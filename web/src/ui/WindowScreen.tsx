import { useEffect, useRef, useState } from 'react'
import { QUALITY, Seat, SeatMap, kindLabel, otherSide, sideLabel } from '../aircraft/seatMap'
import { RouteSample, SUN_EVENT, groundOn, sampleAt, sunSide } from '../flight/analyzer'
import { formatMinutes, formatTime } from '../geo/time'
import { useApp } from '../state'
import { Cabin360, CabinScene } from './cabin3d'
import { AppBar, Segmented } from './Common'
import { EarthView, getGoogleKey, googleEarthUrl, setGoogleKey } from './earth'
import { Icon } from './Icon'
import { RouteMapView } from './Views'

type Mode = 'cabin' | 'earth'

export function WindowScreen() {
  const { state, actions } = useApp()
  const sm = state.seatMap!
  const seat = state.selectedSeat!
  const a = state.analysis
  const sample = a ? sampleAt(a, state.progress) : null
  const [mode, setMode] = useState<Mode>('cabin')
  const [frame, setFrame] = useState(true)
  const info = sm.windowInfo(seat.row)

  const scene: CabinScene = sample
    ? { sunElevation: sample.sun.elevation, sunRelative: sample.sunRelative, water: !groundOn(sample, seat.side), altitudeFt: sample.altitudeFt, seed: seat.row.number }
    : { sunElevation: state.demoSunElevation, sunRelative: seat.side === 'LEFT' ? -70 : 70, water: state.demoWater, altitudeFt: 36000, seed: seat.row.number }

  const moveRow = (delta: number) => {
    const row = sm.rows[sm.rows.indexOf(seat.row) + delta]
    if (!row) return
    const seats = sm.seatsOf(row)
    actions.set({
      selectedSeat: seats.find((s) => s.side === seat.side && s.seatsFromWall === seat.seatsFromWall)
        ?? seats.find((s) => s.side === seat.side) ?? seats[0],
    })
  }
  const swapSide = () => {
    const seats = sm.seatsOf(seat.row)
    const other = otherSide(seat.side)
    actions.set({ selectedSeat: seats.find((s) => s.side === other && s.seatsFromWall === seat.seatsFromWall) ?? seats.find((s) => s.side === other) })
  }

  const ground = sample ? groundOn(sample, seat.side) : null
  const el = scene.sunElevation
  const night = el < -6

  return (
    <div className="screen">
      <AppBar
        title={`Seat ${seat.label}`}
        subtitle={`${sm.aircraft.vendor} ${sm.aircraft.model} · ${sideLabel(seat.side)} ${kindLabel(seat.kind).toLowerCase()}`}
        onBack={actions.back}
        actions={a ? (
          <Segmented value={mode} onChange={setMode} options={[['cabin', <><Icon name="orbit" size={14} />Cabin 360°</>], ['earth', <><Icon name="globe" size={14} />Earth</>]]} />
        ) : undefined}
      />
      <main className="page window-page">
        <div className="stage">
          {mode === 'cabin' || !sample
            ? <CabinStage sm={sm} seat={seat} scene={scene} />
            : <EarthStage sample={sample} seat={seat} frame={frame} night={night} />}
          <div className="stage-top">
            <span className="glass">
              {sample ? <>{ground ? ground.name : 'Open water'} · {Math.round(sample.altitudeFt / 1000)},000 ft</> : <>Simulated · 36,000 ft</>}
            </span>
            <span className="glass"><span className="dot" style={{ background: QUALITY[info.quality].color }} />
              {seat.kind === 'WINDOW' ? QUALITY[info.quality].label : `${seat.seatsFromWall} seat${seat.seatsFromWall > 1 ? 's' : ''} from window`}
            </span>
          </div>
          <div className="stage-bottom">
            <span className="glass hint">Drag to look around{mode === 'cabin' ? ' · pinch to zoom' : ''}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {mode === 'earth' && sample && (
                <>
                  <button type="button" className="glass" onClick={() => setFrame(!frame)}><Icon name="window" size={14} />{frame ? 'Frame on' : 'Frame off'}</button>
                  <a className="glass" href={googleEarthUrl(sample, seat.side)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <Icon name="external" size={14} />Google Earth
                  </a>
                </>
              )}
              <button type="button" className="glass" onClick={() => moveRow(-1)} aria-label="Row ahead"><Icon name="up" size={14} /></button>
              <button type="button" className="glass" onClick={() => moveRow(1)} aria-label="Row behind"><Icon name="down" size={14} /></button>
              <button type="button" className="glass" onClick={swapSide}><Icon name="swap" size={14} />Other side</button>
            </div>
          </div>
        </div>

        <section className="card timeline-card">
          {a && sample ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="progress-head">
                  <div>
                    <div className="eyebrow">Flight progress</div>
                    <div className="big">{formatMinutes(sample.minute)} <span className="muted" style={{ fontSize: 15 }}>of {formatMinutes(a.durationMin)}</span></div>
                  </div>
                  <div className="clocks">
                    <div><span className="eyebrow">{a.route.origin.iata}</span><b>{formatTime(sample.time, a.route.origin.zone)}</b></div>
                    <div><span className="eyebrow">{a.route.destination.iata}</span><b>{formatTime(sample.time, a.route.destination.zone)}</b></div>
                  </div>
                </div>
                <div>
                  <input type="range" min={0} max={1} step={0.001} value={state.progress}
                    onChange={(e) => actions.set({ progress: +e.target.value })} aria-label="Flight progress" />
                  <div className="ticks">
                    {a.sunEvents.map((e) => (
                      <button key={e.minute} type="button" style={{ left: `${(e.minute / a.durationMin) * 100}%` }}
                        title={`Jump to ${SUN_EVENT[e.type].label.toLowerCase()}`}
                        onClick={() => actions.set({ progress: Math.min(1, Math.max(0, e.minute / a.durationMin)) })}>
                        <Icon name={e.type === 'SUNRISE' ? 'sunrise' : 'sunset'} size={16} />
                      </button>
                    ))}
                  </div>
                </div>
                <SunStatus sample={sample} seat={seat} />
                {a.sunEvents.length > 0 && (
                  <div className="chips">
                    {a.sunEvents.slice(0, 3).map((e) => (
                      <button key={e.minute} type="button" className="chip" onClick={() => actions.set({ progress: Math.min(1, Math.max(0, e.minute / a.durationMin)) })}>
                        <Icon name={e.type === 'SUNRISE' ? 'sunrise' : 'sunset'} size={14} />{SUN_EVENT[e.type].label} · {formatTime(e.time, a.route.origin.zone)}
                      </button>
                    ))}
                  </div>
                )}
                {mode === 'earth' && <GoogleKeyField />}
              </div>
              <RouteMapView analysis={a} countries={state.countries} height={230} progress={state.progress} />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="eyebrow">Time of day</div>
                <div className="big" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em' }}>
                  {el < -8 ? 'Night' : el < 0 ? 'Twilight' : el < 10 ? 'Golden hour' : 'Daylight'}
                </div>
                <input type="range" min={-20} max={60} step={0.5} value={state.demoSunElevation}
                  onChange={(e) => actions.set({ demoSunElevation: +e.target.value })} aria-label="Sun elevation" />
                <Segmented
                  value={state.demoWater ? 'sea' : 'land'}
                  onChange={(v) => actions.set({ demoWater: v === 'sea' })}
                  options={[['land', 'Over land'], ['sea', 'Over sea']]}
                />
              </div>
              <p className="muted small">Search by flight number to see the real sun position, terrain and satellite Earth view along your route.</p>
            </>
          )}
        </section>
        <p className="footnote">
          The cabin is built from this aircraft's window spacing and row positions, so a misaligned row looks misaligned.
          Layouts vary by airline. Earth imagery © Esri and its partners, rendered with CesiumJS.
        </p>
      </main>
    </div>
  )
}

function SunStatus({ sample, seat }: { sample: RouteSample; seat: Seat }) {
  const el = sample.sun.elevation
  const side = sunSide(sample)
  const text = el < -6 ? `Night · the sun is ${Math.round(-el)}° below the horizon`
    : side === seat.side ? `The sun is on your side, ${Math.round(el)}° above the horizon`
      : side === null ? 'The sun is ahead of or behind the aircraft'
        : 'The sun is on the other side'
  return <div className="gold small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name={el < -6 ? 'moon' : 'sun'} size={16} />{text}</div>
}

function CabinStage({ sm, seat, scene }: { sm: SeatMap; seat: Seat; scene: CabinScene }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<Cabin360 | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastSide = useRef<string | null>(null)

  useEffect(() => {
    if (!host.current) return
    lastSide.current = null
    try {
      view.current = new Cabin360(host.current)
    } catch {
      setError('3-D view needs WebGL, which this browser has turned off.')
    }
    return () => { view.current?.dispose(); view.current = null }
  }, [])

  useEffect(() => {
    const v = view.current
    if (!v) return
    v.setSeat(sm, seat)
    if (lastSide.current !== seat.side) { v.lookAtWindow(seat.side); lastSide.current = seat.side }
  }, [sm, seat])

  useEffect(() => { view.current?.setScene(scene) },
    [scene.sunElevation, scene.sunRelative, scene.water, scene.altitudeFt, scene.seed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={host} style={{ position: 'absolute', inset: 0 }}>
      {error && <div className="placeholder" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>{error}</div>}
    </div>
  )
}

function EarthStage({ sample, seat, frame, night }: { sample: RouteSample; seat: Seat; frame: boolean; night: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EarthView | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [look, setLook] = useState({ yaw: 0, pitch: 0 })
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)
  const poseRef = useRef({ sample, side: seat.side, ...look })
  poseRef.current = { sample, side: seat.side, ...look }

  useEffect(() => {
    let cancelled = false
    let ev: EarthView | null = null
    EarthView.create(host.current!).then(async (v) => {
      if (cancelled) { v.destroy(); return }
      ev = v
      view.current = v
      v.update(poseRef.current)
      setStatus('ready')
      const key = getGoogleKey()
      if (key) await v.enableGoogleTiles(key).catch(() => undefined)
    }).catch(() => { if (!cancelled) setStatus('error') })
    const onKey = (e: Event) => { view.current?.enableGoogleTiles((e as CustomEvent<string>).detail).catch(() => undefined) }
    window.addEventListener('airsitter:google-key', onKey)
    return () => { cancelled = true; ev?.destroy(); view.current = null; window.removeEventListener('airsitter:google-key', onKey) }
  }, [])

  useEffect(() => { view.current?.update({ sample, side: seat.side, ...look }) }, [sample, seat.side, look])

  return (
    <>
      <div
        ref={host}
        className="cesium"
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, ...look }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const k = 68 / e.currentTarget.clientHeight
          setLook({ yaw: d.yaw - (e.clientX - d.x) * k, pitch: Math.max(-60, Math.min(40, d.pitch + (e.clientY - d.y) * k)) })
        }}
        onPointerUp={() => { drag.current = null }}
      />
      {frame && <div className={`window-mask${night ? ' night' : ''}`}><div /></div>}
      {status !== 'ready' && (
        <div className="placeholder" style={{ position: 'absolute', inset: 0, justifyContent: 'center', background: '#000' }}>
          {status === 'loading' ? 'Loading satellite Earth…' : 'The Earth view could not load. Check your connection and try again.'}
        </div>
      )}
    </>
  )
}

function GoogleKeyField() {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(getGoogleKey())
  const saved = getGoogleKey()
  if (!open) {
    return (
      <button type="button" className="ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
        <Icon name="key" size={14} />{saved ? 'Google 3D tiles on' : 'Add Google photorealistic 3D'}
      </button>
    )
  }
  const apply = (k: string) => {
    setGoogleKey(k)
    window.dispatchEvent(new CustomEvent('airsitter:google-key', { detail: k }))
    setOpen(false)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="key-row">
        <input type="password" placeholder="Google Maps Platform API key" value={key} onChange={(e) => setKey(e.target.value.trim())} autoComplete="off" />
        <button type="button" className="ghost" onClick={() => apply(key)}>Save</button>
        {saved && <button type="button" className="ghost" onClick={() => { setKey(''); apply('') }}>Remove</button>}
      </div>
      <p className="footnote">
        Optional. Uses Google's Map Tiles API with your own key (enable “Map Tiles API” in Google Cloud). The key is
        stored only in this browser.
      </p>
    </div>
  )
}
