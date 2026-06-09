import { NextResponse } from 'next/server';
import { fetchFlightsOpenSky } from '@/lib/fetchers/opensky';
import { fetchMilitaryFlights } from '@/lib/fetchers/adsb-mil';

const MAX_COMMERCIAL = 500;

export async function GET() {
  const [commercial, military] = await Promise.all([
    fetchFlightsOpenSky(),
    fetchMilitaryFlights(),
  ]);

  // Cap commercial flights — military always included in full
  const cappedCommercial = commercial.length > MAX_COMMERCIAL
    ? commercial.sort(() => Math.random() - 0.5).slice(0, MAX_COMMERCIAL)
    : commercial;

  return NextResponse.json({
    commercial: cappedCommercial.length,
    military: military.length,
    flights: [...military, ...cappedCommercial],
  });
}
