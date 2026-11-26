import { createContext, useContext } from 'react'
import { AircraftModel } from './aircraft/aircraft'
import { Seat, SeatMap } from './aircraft/seatMap'
import { FlightAnalysis, Preference } from './flight/analyzer'
import { CountryIndex } from './geo/countries'

export type Screen = 'home' | 'flight' | 'seats' | 'window'

export interface HomeInputs {
  flightNumber: string
  date: string
  time: string
  manualRoute: boolean
  manualOrigin: string
  manualDestination: string
  chosenAircraftId: string | null
}

export interface AppState {
  screen: Screen
  home: HomeInputs
  loading: boolean
  error: string | null
  countries: CountryIndex | null
  analysis: FlightAnalysis | null
  aircraft: AircraftModel | null
  aircraftGuessed: boolean
  seatMap: SeatMap | null
  preference: Preference
  selectedSeat: Seat | null
  /** Flight progress shown in the window view (0..1). */
  progress: number
  /** Aircraft-only mode: simulated sun elevation and ground for the window view. */
  demoSunElevation: number
  demoWater: boolean
}

export interface Actions {
  set: (patch: Partial<AppState>) => void
  setHome: (patch: Partial<HomeInputs>) => void
  navigate: (s: Screen) => void
  back: () => void
  openAircraftOnly: (m: AircraftModel) => void
  setAircraft: (m: AircraftModel, guessed?: boolean) => void
  analyzeFlight: () => void
}

export const AppContext = createContext<{ state: AppState; actions: Actions } | null>(null)

export function useApp() {
  const v = useContext(AppContext)
  if (!v) throw new Error('AppContext missing')
  return v
}
