import { NextResponse } from 'next/server';
import { computeSituations } from '@/lib/situations';
import { ensureFeedsLoaded } from '@/lib/store';
import { detectEscalations, getEscalations } from '@/lib/situation-tracker';

export async function GET() {
  await ensureFeedsLoaded();
  const situations = computeSituations();
  // Detect against persisted state; timestamp injected here (Date.now allowed in route).
  detectEscalations(situations, Date.now());
  return NextResponse.json({ escalations: getEscalations(40) });
}
