import { NextResponse } from 'next/server';
import { fetchSatellites } from '@/lib/fetchers/celestrak';

export async function GET() {
  const satellites = await fetchSatellites();
  return NextResponse.json({ total: satellites.length, satellites });
}
