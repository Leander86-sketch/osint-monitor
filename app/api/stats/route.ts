import { NextResponse } from 'next/server';
import { getDashboardStats, ensureFeedsLoaded } from '@/lib/store';

export async function GET() {
  await ensureFeedsLoaded();
  const stats = getDashboardStats();
  return NextResponse.json(stats);
}
