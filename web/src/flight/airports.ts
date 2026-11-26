import { LatLon } from '../geo/geo'

export interface Airport {
  iata: string
  name: string
  city: string
  lat: number
  lon: number
  /** IANA time zone, or Etc/GMT±N when estimated. */
  zone: string
}

export const airportLabel = (a: Airport) => `${a.city} (${a.iata})`
export const airportLocation = (a: Airport): LatLon => ({ lat: a.lat, lon: a.lon })

const a = (iata: string, name: string, city: string, lat: number, lon: number, zone: string): Airport =>
  ({ iata, name, city, lat, lon, zone })

/** Bundled database of major airports (used offline and to attach time zones). */
export const AIRPORTS: Airport[] = [
  // Middle East
  a("TLV", "Ben Gurion", "Tel Aviv", 32.011, 34.887, "Asia/Jerusalem"),
  a("ETM", "Ramon", "Eilat", 29.724, 35.011, "Asia/Jerusalem"),
  a("DXB", "Dubai Intl", "Dubai", 25.253, 55.364, "Asia/Dubai"),
  a("AUH", "Zayed Intl", "Abu Dhabi", 24.433, 54.651, "Asia/Dubai"),
  a("DOH", "Hamad Intl", "Doha", 25.273, 51.608, "Asia/Qatar"),
  a("AMM", "Queen Alia", "Amman", 31.723, 35.993, "Asia/Amman"),
  a("RUH", "King Khalid", "Riyadh", 24.958, 46.699, "Asia/Riyadh"),
  a("JED", "King Abdulaziz", "Jeddah", 21.680, 39.157, "Asia/Riyadh"),
  a("CAI", "Cairo Intl", "Cairo", 30.122, 31.406, "Africa/Cairo"),
  a("IST", "Istanbul", "Istanbul", 41.262, 28.728, "Europe/Istanbul"),
  a("SAW", "Sabiha Gokcen", "Istanbul", 40.899, 29.309, "Europe/Istanbul"),
  a("AYT", "Antalya", "Antalya", 36.899, 30.800, "Europe/Istanbul"),
  a("LCA", "Larnaca", "Larnaca", 34.875, 33.625, "Asia/Nicosia"),
  // Europe
  a("LHR", "Heathrow", "London", 51.470, -0.454, "Europe/London"),
  a("LGW", "Gatwick", "London", 51.148, -0.190, "Europe/London"),
  a("STN", "Stansted", "London", 51.885, 0.235, "Europe/London"),
  a("LTN", "Luton", "London", 51.875, -0.368, "Europe/London"),
  a("MAN", "Manchester", "Manchester", 53.354, -2.275, "Europe/London"),
  a("EDI", "Edinburgh", "Edinburgh", 55.950, -3.373, "Europe/London"),
  a("DUB", "Dublin", "Dublin", 53.421, -6.270, "Europe/Dublin"),
  a("CDG", "Charles de Gaulle", "Paris", 49.010, 2.548, "Europe/Paris"),
  a("ORY", "Orly", "Paris", 48.723, 2.379, "Europe/Paris"),
  a("NCE", "Cote d'Azur", "Nice", 43.658, 7.216, "Europe/Paris"),
  a("AMS", "Schiphol", "Amsterdam", 52.310, 4.768, "Europe/Amsterdam"),
  a("BRU", "Brussels", "Brussels", 50.901, 4.484, "Europe/Brussels"),
  a("FRA", "Frankfurt", "Frankfurt", 50.037, 8.562, "Europe/Berlin"),
  a("MUC", "Munich", "Munich", 48.354, 11.786, "Europe/Berlin"),
  a("BER", "Brandenburg", "Berlin", 52.366, 13.503, "Europe/Berlin"),
  a("HAM", "Hamburg", "Hamburg", 53.630, 9.988, "Europe/Berlin"),
  a("DUS", "Dusseldorf", "Dusseldorf", 51.289, 6.767, "Europe/Berlin"),
  a("ZRH", "Zurich", "Zurich", 47.465, 8.549, "Europe/Zurich"),
  a("GVA", "Geneva", "Geneva", 46.238, 6.109, "Europe/Zurich"),
  a("VIE", "Vienna", "Vienna", 48.110, 16.570, "Europe/Vienna"),
  a("PRG", "Vaclav Havel", "Prague", 50.101, 14.260, "Europe/Prague"),
  a("WAW", "Chopin", "Warsaw", 52.166, 20.967, "Europe/Warsaw"),
  a("BUD", "Liszt Ferenc", "Budapest", 47.437, 19.256, "Europe/Budapest"),
  a("OTP", "Henri Coanda", "Bucharest", 44.571, 26.085, "Europe/Bucharest"),
  a("SOF", "Sofia", "Sofia", 42.697, 23.411, "Europe/Sofia"),
  a("ATH", "Athens", "Athens", 37.936, 23.947, "Europe/Athens"),
  a("SKG", "Thessaloniki", "Thessaloniki", 40.520, 22.971, "Europe/Athens"),
  a("HER", "Heraklion", "Heraklion", 35.340, 25.180, "Europe/Athens"),
  a("FCO", "Fiumicino", "Rome", 41.800, 12.239, "Europe/Rome"),
  a("MXP", "Malpensa", "Milan", 45.630, 8.723, "Europe/Rome"),
  a("VCE", "Marco Polo", "Venice", 45.505, 12.352, "Europe/Rome"),
  a("NAP", "Naples", "Naples", 40.886, 14.291, "Europe/Rome"),
  a("MAD", "Barajas", "Madrid", 40.472, -3.561, "Europe/Madrid"),
  a("BCN", "El Prat", "Barcelona", 41.297, 2.078, "Europe/Madrid"),
  a("PMI", "Palma", "Palma de Mallorca", 39.552, 2.736, "Europe/Madrid"),
  a("AGP", "Malaga", "Malaga", 36.675, -4.499, "Europe/Madrid"),
  a("LIS", "Humberto Delgado", "Lisbon", 38.774, -9.134, "Europe/Lisbon"),
  a("OPO", "Porto", "Porto", 41.248, -8.681, "Europe/Lisbon"),
  a("CPH", "Kastrup", "Copenhagen", 55.618, 12.656, "Europe/Copenhagen"),
  a("ARN", "Arlanda", "Stockholm", 59.652, 17.919, "Europe/Stockholm"),
  a("OSL", "Gardermoen", "Oslo", 60.194, 11.100, "Europe/Oslo"),
  a("HEL", "Helsinki-Vantaa", "Helsinki", 60.317, 24.963, "Europe/Helsinki"),
  a("KEF", "Keflavik", "Reykjavik", 63.985, -22.605, "Atlantic/Reykjavik"),
  a("KBP", "Boryspil", "Kyiv", 50.345, 30.895, "Europe/Kyiv"),
  // Africa
  a("JNB", "O.R. Tambo", "Johannesburg", -26.139, 28.246, "Africa/Johannesburg"),
  a("CPT", "Cape Town", "Cape Town", -33.965, 18.602, "Africa/Johannesburg"),
  a("ADD", "Bole", "Addis Ababa", 8.978, 38.799, "Africa/Addis_Ababa"),
  a("NBO", "Jomo Kenyatta", "Nairobi", -1.319, 36.928, "Africa/Nairobi"),
  a("CMN", "Mohammed V", "Casablanca", 33.367, -7.590, "Africa/Casablanca"),
  a("RAK", "Menara", "Marrakesh", 31.607, -8.036, "Africa/Casablanca"),
  a("LOS", "Murtala Muhammed", "Lagos", 6.577, 3.321, "Africa/Lagos"),
  // Asia
  a("DEL", "Indira Gandhi", "Delhi", 28.556, 77.100, "Asia/Kolkata"),
  a("BOM", "Chhatrapati Shivaji", "Mumbai", 19.089, 72.866, "Asia/Kolkata"),
  a("BLR", "Kempegowda", "Bengaluru", 13.199, 77.706, "Asia/Kolkata"),
  a("BKK", "Suvarnabhumi", "Bangkok", 13.690, 100.750, "Asia/Bangkok"),
  a("HKT", "Phuket", "Phuket", 8.113, 98.317, "Asia/Bangkok"),
  a("SIN", "Changi", "Singapore", 1.364, 103.991, "Asia/Singapore"),
  a("KUL", "Kuala Lumpur Intl", "Kuala Lumpur", 2.746, 101.710, "Asia/Kuala_Lumpur"),
  a("CGK", "Soekarno-Hatta", "Jakarta", -6.126, 106.656, "Asia/Jakarta"),
  a("DPS", "Ngurah Rai", "Bali", -8.748, 115.167, "Asia/Makassar"),
  a("MNL", "Ninoy Aquino", "Manila", 14.509, 121.020, "Asia/Manila"),
  a("HKG", "Hong Kong Intl", "Hong Kong", 22.308, 113.918, "Asia/Hong_Kong"),
  a("TPE", "Taoyuan", "Taipei", 25.078, 121.233, "Asia/Taipei"),
  a("PEK", "Capital", "Beijing", 40.080, 116.585, "Asia/Shanghai"),
  a("PKX", "Daxing", "Beijing", 39.509, 116.411, "Asia/Shanghai"),
  a("PVG", "Pudong", "Shanghai", 31.144, 121.808, "Asia/Shanghai"),
  a("CAN", "Baiyun", "Guangzhou", 23.392, 113.299, "Asia/Shanghai"),
  a("ICN", "Incheon", "Seoul", 37.460, 126.441, "Asia/Seoul"),
  a("NRT", "Narita", "Tokyo", 35.765, 140.386, "Asia/Tokyo"),
  a("HND", "Haneda", "Tokyo", 35.549, 139.780, "Asia/Tokyo"),
  a("KIX", "Kansai", "Osaka", 34.427, 135.244, "Asia/Tokyo"),
  a("TAS", "Tashkent", "Tashkent", 41.258, 69.281, "Asia/Tashkent"),
  a("ALA", "Almaty", "Almaty", 43.352, 77.040, "Asia/Almaty"),
  a("TBS", "Tbilisi", "Tbilisi", 41.669, 44.955, "Asia/Tbilisi"),
  a("GYD", "Heydar Aliyev", "Baku", 40.467, 50.047, "Asia/Baku"),
  // Oceania
  a("SYD", "Kingsford Smith", "Sydney", -33.946, 151.177, "Australia/Sydney"),
  a("MEL", "Tullamarine", "Melbourne", -37.669, 144.841, "Australia/Melbourne"),
  a("BNE", "Brisbane", "Brisbane", -27.384, 153.117, "Australia/Brisbane"),
  a("PER", "Perth", "Perth", -31.940, 115.967, "Australia/Perth"),
  a("AKL", "Auckland", "Auckland", -37.008, 174.792, "Pacific/Auckland"),
  a("HNL", "Daniel K. Inouye", "Honolulu", 21.318, -157.922, "Pacific/Honolulu"),
  // North America
  a("JFK", "John F. Kennedy", "New York", 40.640, -73.779, "America/New_York"),
  a("EWR", "Newark Liberty", "Newark", 40.690, -74.174, "America/New_York"),
  a("LGA", "LaGuardia", "New York", 40.777, -73.873, "America/New_York"),
  a("BOS", "Logan", "Boston", 42.366, -71.010, "America/New_York"),
  a("IAD", "Dulles", "Washington", 38.953, -77.456, "America/New_York"),
  a("PHL", "Philadelphia", "Philadelphia", 39.874, -75.243, "America/New_York"),
  a("ATL", "Hartsfield-Jackson", "Atlanta", 33.641, -84.428, "America/New_York"),
  a("MIA", "Miami", "Miami", 25.795, -80.287, "America/New_York"),
  a("MCO", "Orlando", "Orlando", 28.431, -81.308, "America/New_York"),
  a("ORD", "O'Hare", "Chicago", 41.974, -87.907, "America/Chicago"),
  a("DFW", "Dallas/Fort Worth", "Dallas", 32.900, -97.040, "America/Chicago"),
  a("IAH", "George Bush", "Houston", 29.990, -95.337, "America/Chicago"),
  a("DEN", "Denver", "Denver", 39.856, -104.674, "America/Denver"),
  a("PHX", "Sky Harbor", "Phoenix", 33.437, -112.008, "America/Phoenix"),
  a("LAS", "Harry Reid", "Las Vegas", 36.084, -115.154, "America/Los_Angeles"),
  a("LAX", "Los Angeles", "Los Angeles", 33.942, -118.408, "America/Los_Angeles"),
  a("SFO", "San Francisco", "San Francisco", 37.621, -122.379, "America/Los_Angeles"),
  a("SEA", "Seattle-Tacoma", "Seattle", 47.450, -122.309, "America/Los_Angeles"),
  a("YYZ", "Pearson", "Toronto", 43.677, -79.631, "America/Toronto"),
  a("YUL", "Trudeau", "Montreal", 45.470, -73.741, "America/Toronto"),
  a("YVR", "Vancouver", "Vancouver", 49.195, -123.184, "America/Vancouver"),
  a("MEX", "Benito Juarez", "Mexico City", 19.436, -99.072, "America/Mexico_City"),
  a("CUN", "Cancun", "Cancun", 21.037, -86.877, "America/Cancun"),
  // South America
  a("GRU", "Guarulhos", "Sao Paulo", -23.432, -46.470, "America/Sao_Paulo"),
  a("GIG", "Galeao", "Rio de Janeiro", -22.810, -43.251, "America/Sao_Paulo"),
  a("EZE", "Ezeiza", "Buenos Aires", -34.822, -58.536, "America/Argentina/Buenos_Aires"),
  a("SCL", "Arturo Merino Benitez", "Santiago", -33.393, -70.786, "America/Santiago"),
  a("BOG", "El Dorado", "Bogota", 4.702, -74.147, "America/Bogota"),
  a("LIM", "Jorge Chavez", "Lima", -12.022, -77.114, "America/Lima"),
  a("PTY", "Tocumen", "Panama City", 9.071, -79.383, "America/Panama"),
]

const byCode = new Map(AIRPORTS.map((x) => [x.iata, x]))

export function findAirport(iata: string | null | undefined): Airport | undefined {
  return iata ? byCode.get(iata.trim().toUpperCase()) : undefined
}

export function searchAirports(query: string): Airport[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return AIRPORTS.filter((x) =>
    x.iata.toLowerCase() === q || x.city.toLowerCase().includes(q) || x.name.toLowerCase().includes(q),
  ).slice(0, 8)
}
