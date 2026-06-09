import { NextResponse } from 'next/server';
import { fetchAcled } from '@/lib/fetchers/acled';

export async function GET() {
  try {
    const events = await fetchAcled();
    return NextResponse.json({ total: events.length, events });
  } catch {
    return NextResponse.json({ total: 0, events: [] });
  }
}
