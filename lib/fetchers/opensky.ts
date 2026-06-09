import { Flight } from '../types';
import { getStore } from '../layer-store';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const CACHE_MS = 60_000;

export async function fetchFlightsOpenSky(): Promise<Flight[]> {
  const store = getStore().flights;
  if (Date.now() - store.lastFetch < CACHE_MS && store.data.length > 0) {
    return store.data.filter(f => !f.military);
  }

  try {
    const res = await fetch(OPENSKY_URL, {
      headers: { 'User-Agent': 'OSINT-Monitor/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`OpenSky ${res.status}`);
    const json = await res.json();
    const states: unknown[][] = json.states || [];

    const flights: Flight[] = states
      .filter((s) => s[6] != null && s[5] != null)
      .map((s) => ({
        icao: String(s[0] || ''),
        callsign: String(s[1] || '').trim(),
        originCountry: String(s[2] || ''),
        lat: Number(s[6]),
        lng: Number(s[5]),
        altitude: Number(s[7] || s[13] || 0),
        speed: Number(s[9] || 0),
        heading: Number(s[10] || 0),
        verticalRate: Number(s[11] || 0),
        onGround: Boolean(s[8]),
        military: false,
      }));

    // Merge with existing military flights
    const milFlights = store.data.filter(f => f.military);
    store.data = [...flights, ...milFlights];
    store.lastFetch = Date.now();

    return flights;
  } catch (err) {
    console.error('[OpenSky] Fetch failed:', err);
    return store.data.filter(f => !f.military);
  }
}
