import { NextResponse } from 'next/server';
import { fetchNavWarnings } from '@/lib/fetchers/navwarn';
export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await fetchNavWarnings();
  return NextResponse.json(s, { headers: { 'Cache-Control': 'public, max-age=900' } });
}
