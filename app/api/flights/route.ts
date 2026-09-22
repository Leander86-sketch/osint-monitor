import { NextResponse } from 'next/server';
import { fetchFlightsOpenSky } from '@/lib/fetchers/opensky';
import { fetchMilitaryFlights } from '@/lib/fetchers/adsb-mil';
import { notableFor } from '@/lib/plane-alert';

const MAX_COMMERCIAL = 500;

export async function GET() {
  const [commercial, military] = await Promise.all([
    fetchFlightsOpenSky(),
    fetchMilitaryFlights(),
  ]);

  // opvallende toestellen markeren (Doomsday plane, SIGINT, Dictator Alert …) via plane-alert-db
  await Promise.all(military.map(async f => { const n = await notableFor(f.icao); if (n) f.notable = n; }));
  const notable = military.filter(f => f.notable).map(f => ({ icao: f.icao, callsign: f.callsign, badge: f.notable!.badge, operator: f.notable!.operator, type: f.notable!.type, lat: f.lat, lng: f.lng }));

  // Cap commercial flights — military always included in full
  const cappedCommercial = commercial.length > MAX_COMMERCIAL
    ? commercial.sort(() => Math.random() - 0.5).slice(0, MAX_COMMERCIAL)
    : commercial;

  return NextResponse.json({
    commercial: cappedCommercial.length,
    military: military.length,
    notable,
    flights: [...military, ...cappedCommercial],
  });
}
