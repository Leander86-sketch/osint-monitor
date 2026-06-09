import { NextRequest, NextResponse } from 'next/server';
import { computeSituations } from '@/lib/situations';
import { ensureFeedsLoaded, getLastFetchTime } from '@/lib/store';

export async function GET(request: NextRequest) {
  await ensureFeedsLoaded();
  const type = request.nextUrl.searchParams.get('type');
  let situations = computeSituations();
  if (type) situations = situations.filter(s => s.type === type);
  return NextResponse.json({ situations, lastFetch: getLastFetchTime() });
}
