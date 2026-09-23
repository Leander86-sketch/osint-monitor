import { NextResponse } from 'next/server';
import { getFrontline } from '@/lib/fetchers/frontline';

export async function GET() {
  const data = await getFrontline();
  if (!data) {
    return NextResponse.json({ available: false, geojson: null }, { status: 200 });
  }
  return NextResponse.json({
    available: true,
    date: data.date,
    source: data.origin === 'mirror' ? 'DeepStateMap via github.com/cyterat/deepstate-map-data' : 'DeepStateMap (deepstatemap.live)',
    geojson: data.geojson,
  });
}
