import { NextResponse } from 'next/server';
import { getAirAlerts } from '@/lib/fetchers/airalerts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const d = await getAirAlerts();
  if (!d) return NextResponse.json({ available: false, states: [], active: 0 }, { status: 200 });
  return NextResponse.json({ available: true, updated: d.updated, active: d.active, states: d.states, source: 'alerts.com.ua' });
}
