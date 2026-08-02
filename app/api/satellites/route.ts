import { NextResponse } from 'next/server';
import { fetchSatellites } from '@/lib/fetchers/celestrak';

export async function GET() {
  const satellites = await fetchSatellites();
  // Strip TLE lines and round floats - the client only plots position and
  // shows alt/speed/catalog; this cuts the payload from ~3.8 MB to well under 1 MB.
  const slim = satellites.map(s => ({
    id: s.id,
    name: s.name,
    lat: Math.round(s.lat * 100) / 100,
    lng: Math.round(s.lng * 100) / 100,
    altitude: Math.round(s.altitude),
    speed: Math.round(s.speed),
    noradId: s.noradId,
    intlDesignator: s.intlDesignator,
  }));
  return NextResponse.json({ total: slim.length, satellites: slim });
}
