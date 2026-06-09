import { NextResponse } from 'next/server';
import { fetchGdeltConflicts } from '@/lib/fetchers/gdelt-conflicts';

export async function GET() {
  const conflicts = await fetchGdeltConflicts();
  return NextResponse.json({ total: conflicts.length, conflicts });
}
