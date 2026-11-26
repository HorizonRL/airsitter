import { useState } from 'react'
import { AIRCRAFT, VENDORS, aircraftById, displayName, seatCount } from '../aircraft/aircraft'
import { AIRPORTS } from '../flight/airports'
import { useApp } from '../state'
import { AircraftPicker, Chip, Segmented } from './Common'
import { Icon } from './Icon'

const EXAMPLES = ['LY1', 'BA117', 'SQ22', 'EK1', 'UA1', 'QF12']

export function HomeScreen() {
  const { state, actions } = useApp()
  const [tab, setTab] = useState<'flight' | 'aircraft'>('flight')
  const [vendor, setVendor] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const h = state.home
  const chosen = aircraftById(h.chosenAircraftId)

  return (
    <main className="page home screen">
      <nav className="home-nav">
        <span className="wordmark">AirSitter</span>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[['flight', 'Flight'], ['aircraft', 'Aircraft']]}
        />
      </nav>

      <section className="hero">
        <span className="eyebrow">Seat intelligence</span>
        <h1>Choose your side<br /><span className="dim">of the sky.</span></h1>
        <p>Sunrise and sunset, the countries below, the open ocean — and the exact view from every seat.</p>
      </section>

      {tab === 'flight' ? (
        <form className="card form" onSubmit={(e) => { e.preventDefault(); actions.analyzeFlight() }}>
          <label className="field">
            <span>Flight number</span>
            <input
              className="hero-input"
              value={h.flightNumber}
              placeholder="LY 1"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => actions.setHome({ flightNumber: e.target.value })}
            />
          </label>
          <div className="examples">
            <span className="label">Try</span>
            {EXAMPLES.map((x) => <Chip key={x} onClick={() => actions.setHome({ flightNumber: x, manualRoute: false })}>{x}</Chip>)}
          </div>
          <div className="row2">
            <label className="field">
              <span>Departure date</span>
              <input type="date" value={h.date} onChange={(e) => actions.setHome({ date: e.target.value })} required />
            </label>
            <label className="field">
              <span>Local departure time</span>
              <input type="time" value={h.time} onChange={(e) => actions.setHome({ time: e.target.value })} required />
            </label>
          </div>

          <label className="switch">
            <input type="checkbox" checked={h.manualRoute} onChange={(e) => actions.setHome({ manualRoute: e.target.checked })} />
            <span>Enter the route myself</span>
          </label>
          {h.manualRoute && (
            <div className="row2">
              <label className="field">
                <span>From</span>
                <input list="airports" value={h.manualOrigin} placeholder="TLV" onChange={(e) => actions.setHome({ manualOrigin: e.target.value })} />
              </label>
              <label className="field">
                <span>To</span>
                <input list="airports" value={h.manualDestination} placeholder="JFK" onChange={(e) => actions.setHome({ manualDestination: e.target.value })} />
              </label>
              <datalist id="airports">
                {AIRPORTS.map((a) => <option key={a.iata} value={a.iata}>{a.city} — {a.name}</option>)}
              </datalist>
            </div>
          )}

          <button type="button" className="select-row" onClick={() => setPicker(true)}>
            <Icon name="plane" />
            <span className="value">{chosen ? displayName(chosen) : 'Aircraft — typical for this flight'}</span>
            <Icon name="edit" size={16} className="muted" />
          </button>

          {state.error && <div className="error" role="alert">{state.error}</div>}

          <button type="submit" className="primary block" disabled={state.loading}>
            {state.loading ? 'Finding your flight…' : <>Find my side <Icon name="arrow" size={16} /></>}
          </button>
          <p className="footnote">
            Times are local to the departure airport. Routes come from a curated list of well-known flights or the
            open adsbdb.com database.
          </p>
          {picker && (
            <AircraftPicker
              current={chosen ?? null}
              onClose={() => setPicker(false)}
              onPick={(m) => { actions.setHome({ chosenAircraftId: m.id }); setPicker(false) }}
            />
          )}
        </form>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chips">
            <Chip selected={vendor === null} onClick={() => setVendor(null)}>All</Chip>
            {VENDORS.map((v) => <Chip key={v} selected={vendor === v} onClick={() => setVendor(v)}>{v}</Chip>)}
          </div>
          <div className="model-grid">
            {AIRCRAFT.filter((m) => !vendor || m.vendor === vendor).map((m) => (
              <button key={m.id} className="model-card" onClick={() => actions.openAircraftOnly(m)}>
                <span className="eyebrow">{m.vendor}</span>
                <span className="model-name">{m.model}</span>
                <span className="muted small num">
                  {seatCount(m)} seats · {m.widebody ? 'Wide-body' : 'Narrow-body'}{m.wing === 'HIGH' ? ' · High wing' : ''}
                </span>
                <span className="go"><Icon name="arrow" size={16} /></span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
