import { Flight } from '../types';
import { getStore } from '../layer-store';

const ADSB_MIL_URL = 'https://api.adsb.lol/v2/mil';
const CACHE_MS = 60_000;

interface AdsbAircraft {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  lat?: number;
  lon?: number;
  baro_rate?: number;
}

export async function fetchMilitaryFlights(): Promise<Flight[]> {
  const store = getStore().flights;
  const milFlights = store.data.filter(f => f.military);
  if (Date.now() - store.lastFetch < CACHE_MS && milFlights.length > 0) {
    return milFlights;
  }

  try {
    const res = await fetch(ADSB_MIL_URL, {
      headers: { 'User-Agent': 'OSINT-Monitor/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`adsb.lol ${res.status}`);
    const json = await res.json();
    const ac: AdsbAircraft[] = json.ac || [];

    const flights: Flight[] = ac
      .filter((a) => a.lat != null && a.lon != null)
      .map((a) => ({
        icao: a.hex || '',
        callsign: (a.flight || '').trim(),
        originCountry: '',
        lat: a.lat!,
        lng: a.lon!,
        altitude: typeof a.alt_baro === 'number' ? a.alt_baro : 0,
        speed: a.gs || 0,
        heading: a.track || 0,
        verticalRate: a.baro_rate || 0,
        onGround: false,
        military: true,
        type: a.t,
        registration: a.r,
      }));

    // Merge with existing commercial flights
    const civFlights = store.data.filter(f => !f.military);
    store.data = [...civFlights, ...flights];
    store.lastFetch = Date.now();

    return flights;
  } catch (err) {
    console.error('[adsb.lol] Fetch failed:', err);
    return milFlights;
  }
}
