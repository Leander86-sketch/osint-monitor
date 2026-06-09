import { NextResponse } from 'next/server';
import { fetchFirms } from '@/lib/fetchers/firms';

export async function GET() {
  try {
    const fires = await fetchFirms();
    return NextResponse.json({ total: fires.length, fires });
  } catch {
    return NextResponse.json({ total: 0, fires: [] });
  }
}
