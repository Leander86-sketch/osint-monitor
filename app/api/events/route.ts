import { NextResponse } from 'next/server';
import { getGeoEvents, ensureFeedsLoaded } from '@/lib/store';

export async function GET() {
  await ensureFeedsLoaded();
  const events = getGeoEvents();
  return NextResponse.json({ events, total: events.length });
}
