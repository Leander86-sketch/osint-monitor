import { NextResponse } from 'next/server';
import { fetchOutages } from '@/lib/fetchers/outages';

export async function GET() {
  const { available, outages } = await fetchOutages();
  return NextResponse.json({ available, total: outages.length, outages });
}
