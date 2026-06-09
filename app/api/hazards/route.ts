import { NextResponse } from 'next/server';
import { fetchHazards } from '@/lib/fetchers/hazards';

export async function GET() {
  try {
    const hazards = await fetchHazards();
    return NextResponse.json({ total: hazards.length, hazards });
  } catch {
    return NextResponse.json({ total: 0, hazards: [] });
  }
}
