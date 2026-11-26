import { useState } from 'react'
import { displayName } from '../aircraft/aircraft'
import { FlightAnalysis, PREFERENCE, Preference, SUN_EVENT, SideReport, recommend } from '../flight/analyzer'
import { formatDateTime, formatMinutes, formatTime } from '../geo/time'
import { useApp } from '../state'
import { sideColor } from './color'
import { AircraftPicker, AppBar, CountryChip, Segmented } from './Common'
import { Icon } from './Icon'
import { RouteMapView } from './Views'

export function FlightScreen() {
  const { state, actions } = useApp()
  const a = state.analysis!
  const [picker, setPicker] = useState(false)
  const rec = recommend(a, state.preference)
  const letters = (state.seatMap?.rows.at(-1)?.section.layout ?? 'A-F').replace(/-/g, '')
  const winLetters = { LEFT: letters[0], RIGHT: letters[letters.length - 1] }
  const recColor = sideColor(rec.side)
  const o = a.route.origin, d = a.route.destination

  return (
    <div className="screen">
      <AppBar title={`${a.route.flightNumber} · ${o.city} to ${d.city}`} subtitle={a.route.airline ?? a.route.source} onBack={actions.back} />
      <main className="page">
        <section className="card">
          <div className="route-hero">
            <div>
              <div className="code">{o.iata}</div>
              <div className="muted small">{o.city} · {formatDateTime(a.departure, o.zone)}</div>
            </div>
            <div className="mid">
              <Icon name="plane" size={20} />
              <div className="line" />
              <span className="small num">{formatMinutes(a.durationMin)}</span>
            </div>
            <div className="right">
              <div className="code">{d.iata}</div>
              <div className="muted small">{d.city} · {formatDateTime(a.arrival, d.zone)}</div>
            </div>
          </div>
          <RouteMapView analysis={a} countries={state.countries} height={320} />
          <div className="stats">
            <div className="stat"><span className="eyebrow">Distance</span><span className="v">{a.distanceKm.toLocaleString()} km</span></div>
            <div className="stat"><span className="eyebrow">Daylight</span><span className="v">{a.daylightPercent}%</span></div>
            <div className="stat"><span className="eyebrow">Sun events</span><span className="v">{a.sunEvents.length || 'None'}</span></div>
            <button className="stat" style={{ border: 'none', textAlign: 'left' }} onClick={() => setPicker(true)}>
              <span className="eyebrow">Aircraft {state.aircraftGuessed ? '· typical' : ''}</span>
              <span className="v" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                {state.aircraft ? state.aircraft.model.replace(/ \(.*\)/, '') : '—'} <Icon name="edit" size={14} className="muted" />
              </span>
            </button>
          </div>
        </section>

        <div className="section-title">
          <h2>Recommendation</h2>
          <Segmented
            value={state.preference}
            onChange={(p: Preference) => actions.set({ preference: p })}
            options={(Object.keys(PREFERENCE) as Preference[]).map((p) => [p, PREFERENCE[p].label])}
          />
        </div>

        <section className="card rec" style={{ ['--rec-glow' as string]: `${recColor}22` }}>
          <span className="eyebrow">{PREFERENCE[state.preference].description}</span>
          <div className="rec-title">
            {rec.side === 'LEFT' ? <>Sit on the <span style={{ color: recColor }}>left</span>, seat {winLetters.LEFT}.</>
              : rec.side === 'RIGHT' ? <>Sit on the <span style={{ color: recColor }}>right</span>, seat {winLetters.RIGHT}.</>
                : 'Either side works.'}
          </div>
          <ul>{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <span className="footnote">Left and right as seen facing the front of the aircraft.</span>
        </section>

        <div className="sides">
          <SideCard a={a} r={a.left} recommended={rec.side === 'LEFT'} letter={winLetters.LEFT} />
          <SideCard a={a} r={a.right} recommended={rec.side === 'RIGHT'} letter={winLetters.RIGHT} />
        </div>

        {a.sunEvents.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: 22 }}>Sun timeline</h2>
            <div className="timeline">
              {a.sunEvents.map((e) => (
                <div className="tl-item" key={e.minute}>
                  <span className="tl-icon"><Icon name={e.type === 'SUNRISE' ? 'sunrise' : 'sunset'} /></span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{SUN_EVENT[e.type].label}, {formatMinutes(e.minute)} into the flight</div>
                    <div className="muted small">
                      {e.side === 'LEFT' ? 'Left side' : e.side === 'RIGHT' ? 'Right side' : 'Ahead or behind the aircraft'}
                    </div>
                  </div>
                  <span className="num muted small">{formatTime(e.time, o.zone)} {o.iata}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <button className="primary block" onClick={() => { actions.set({ selectedSeat: null }); actions.navigate('seats') }}>
          Choose a seat on the {state.aircraft ? displayName(state.aircraft).replace(/ \(.*\)/, '') : 'aircraft'} <Icon name="arrow" size={16} />
        </button>
        <p className="footnote">
          Estimates assume a great-circle path at typical cruise speed; real routes vary with winds and air-traffic
          control. Borders from Natural Earth 1:110m. “In view” means within roughly 140 km of the aircraft on that side.
        </p>
      </main>
      {picker && (
        <AircraftPicker
          current={state.aircraft}
          onClose={() => setPicker(false)}
          onPick={(m) => { actions.setAircraft(m, false); setPicker(false) }}
        />
      )}
    </div>
  )
}

function SideCard({ a, r, recommended, letter }: { a: FlightAnalysis; r: SideReport; recommended: boolean; letter: string }) {
  const color = sideColor(r.side)
  return (
    <section className={`card side-card${recommended ? ' rec-side' : ''}`} style={{ ['--side' as string]: color }}>
      <div className="side-head">
        <span className="side-name"><i />{r.side === 'LEFT' ? 'Left side' : 'Right side'}<span className="faint small" style={{ fontWeight: 400 }}>Seat {letter}</span></span>
        {recommended && <span className="badge" style={{ color }}>Best</span>}
      </div>
      <div className="metric">
        <span className="k"><Icon name="sunrise" size={16} />Sunrise / sunset</span>
        <span className="val">
          {r.sunEvents.length === 0 ? <span className="faint">None</span> : r.sunEvents.map((e) => (
            <div key={e.minute}>{SUN_EVENT[e.type].label} · {formatTime(e.time, a.route.origin.zone)}</div>
          ))}
        </span>
      </div>
      <div className="metric"><span className="k"><Icon name="sun" size={16} />Direct sun</span><span className="val">{formatMinutes(r.directSunMinutes)}</span></div>
      <div className="metric">
        <span className="k"><Icon name="water" size={16} />Over water</span>
        <span className="val water"><span className="bar"><div style={{ width: `${r.waterPercent}%`, background: color }} /></span>{r.waterPercent}%</span>
      </div>
      <div className="metric"><span className="k"><Icon name="eye" size={16} />Land in daylight</span><span className="val">{formatMinutes(r.daylightLandMinutes)}</span></div>
      <div className="countries">
        <span className="eyebrow">In view · {r.countries.length} {r.countries.length === 1 ? 'country' : 'countries'}</span>
        <div className="flags">
          {r.countries.slice(0, 14).map((v) => <CountryChip key={v.country.iso2 + v.country.name} name={v.country.name} iso2={v.country.iso2} minutes={v.minutes} />)}
          {r.countries.length > 14 && <span className="faint small">+{r.countries.length - 14} more</span>}
          {r.countries.length === 0 && <span className="faint small">Open sea only</span>}
        </div>
      </div>
    </section>
  )
}
