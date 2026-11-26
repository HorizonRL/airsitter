import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AircraftModel, aircraftById } from './aircraft/aircraft'
import { SeatMap } from './aircraft/seatMap'
import { airportLocation, findAirport, searchAirports } from './flight/airports'
import { analyzeFlight } from './flight/analyzer'
import { FlightRoute, lookupFlight, normalizeFlightNumber } from './flight/lookup'
import { loadCountries } from './geo/countries'
import { distanceKm } from './geo/geo'
import { zonedToEpoch } from './geo/time'
import { Actions, AppContext, AppState, HomeInputs, Screen } from './state'
import { FlightScreen } from './ui/FlightScreen'
import { HomeScreen } from './ui/HomeScreen'
import { SeatsScreen } from './ui/SeatsScreen'
import { WindowScreen } from './ui/WindowScreen'

const pad = (n: number) => String(n).padStart(2, '0')

function initialHome(): HomeInputs {
  const now = new Date(Date.now() + 3600_000)
  return {
    flightNumber: '',
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:00`,
    manualRoute: false,
    manualOrigin: '',
    manualDestination: '',
    chosenAircraftId: null,
  }
}

export default function App() {
  const [stack, setStack] = useState<Screen[]>(['home'])
  const [s, setS] = useState<Omit<AppState, 'screen'>>(() => ({
    home: initialHome(),
    loading: false,
    error: null,
    countries: null,
    analysis: null,
    aircraft: null,
    aircraftGuessed: false,
    seatMap: null,
    preference: 'BEST_VIEWS',
    selectedSeat: null,
    progress: 0.5,
    demoSunElevation: 25,
    demoWater: false,
  }))
  const stateRef = useRef(s)
  stateRef.current = s

  useEffect(() => {
    loadCountries().then((c) => setS((p) => ({ ...p, countries: c }))).catch(() => {
      setS((p) => ({ ...p, error: 'Could not load the world map data. Reload the page to try again.' }))
    })
  }, [])

  // Browser back button pops the in-app screen stack.
  useEffect(() => {
    const onPop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [stack.length])

  const actions = useMemo<Actions>(() => {
    const set = (patch: Partial<AppState>) => setS((p) => ({ ...p, ...patch }))
    const navigate = (screen: Screen) => {
      history.pushState({ depth: Date.now() }, '')
      setStack((st) => [...st, screen])
    }
    const setAircraft = (m: AircraftModel, guessed = false) =>
      set({ aircraft: m, aircraftGuessed: guessed, seatMap: new SeatMap(m), selectedSeat: null })

    return {
      set,
      setHome: (patch) => setS((p) => ({ ...p, home: { ...p.home, ...patch } })),
      navigate,
      back: () => history.back(),
      setAircraft,
      openAircraftOnly: (m) => {
        set({ analysis: null })
        setAircraft(m)
        navigate('seats')
      },
      analyzeFlight: async () => {
        const cur = stateRef.current
        if (cur.loading) return
        const h = cur.home
        set({ error: null, loading: true })
        try {
          let route: FlightRoute | null = null
          if (h.manualRoute) {
            const o = findAirport(h.manualOrigin) ?? searchAirports(h.manualOrigin)[0]
            const d = findAirport(h.manualDestination) ?? searchAirports(h.manualDestination)[0]
            if (!o || !d) set({ error: 'Unknown airport. Use a 3-letter code such as TLV, JFK, LHR.' })
            else if (o.iata === d.iata) set({ error: 'Origin and destination are the same airport.' })
            else route = {
              flightNumber: normalizeFlightNumber(h.flightNumber || `${o.iata}-${d.iata}`),
              airline: null, origin: o, destination: d, typicalAircraftId: null, source: 'Manual route',
            }
          } else if (!h.flightNumber.trim()) {
            set({ error: 'Enter a flight number (e.g. BA117) or switch to manual route.' })
          } else {
            route = await lookupFlight(h.flightNumber)
            if (!route) {
              setS((p) => ({
                ...p,
                error: `Couldn't find ${h.flightNumber.toUpperCase()}. Enter the route manually below.`,
                home: { ...p.home, manualRoute: true },
              }))
            }
          }
          if (route) {
            const countries = cur.countries ?? (await loadCountries())
            const departure = zonedToEpoch(h.date, h.time, route.origin.zone)
            const analysis = analyzeFlight(route, departure, countries)
            const chosen = aircraftById(h.chosenAircraftId)
            const typical = aircraftById(route.typicalAircraftId)
            const fallback = aircraftById(
              distanceKm(airportLocation(route.origin), airportLocation(route.destination)) > 4500 ? '787-9' : 'A320neo',
            )!
            set({ analysis, countries, progress: 0.5 })
            setAircraft(chosen ?? typical ?? fallback, !chosen)
            navigate('flight')
          }
        } catch (e) {
          set({ error: `Something went wrong: ${e instanceof Error ? e.message : String(e)}` })
        } finally {
          set({ loading: false })
        }
      },
    }
  }, [])

  const state: AppState = { ...s, screen: stack[stack.length - 1] }
  const ctx = useMemo(() => ({ state, actions }), [s, stack, actions]) // eslint-disable-line react-hooks/exhaustive-deps

  const render = useCallback(() => {
    switch (state.screen) {
      case 'flight': return state.analysis ? <FlightScreen /> : <HomeScreen />
      case 'seats': return state.seatMap ? <SeatsScreen /> : <HomeScreen />
      case 'window': return state.seatMap && state.selectedSeat ? <WindowScreen /> : <HomeScreen />
      default: return <HomeScreen />
    }
  }, [state.screen, state.analysis, state.seatMap, state.selectedSeat])

  return <AppContext.Provider value={ctx}><div className="app">{render()}</div></AppContext.Provider>
}
