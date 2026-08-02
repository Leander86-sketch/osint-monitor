import { NextResponse } from 'next/server';
import { getShips } from '@/lib/fetchers/ais';

export async function GET() {
  const { available, ships } = getShips();
  // First call after idle starts the stream; data builds up within a minute
  return NextResponse.json({ available, total: ships.length, warming: available && ships.length === 0, ships });
}
