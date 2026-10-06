import { NextRequest, NextResponse } from 'next/server';
import { computeSituations } from '@/lib/situations';
import { ensureFeedsLoaded, getLastFetchTime } from '@/lib/store';
import { listDossierSlugs } from '@/lib/dossiers';

export async function GET(request: NextRequest) {
  await ensureFeedsLoaded();
  const type = request.nextUrl.searchParams.get('type');
  let situations = computeSituations();
  if (type) situations = situations.filter(s => s.type === type);
  const dossiers = new Set(listDossierSlugs()); // situaties met een handgemaakt dossier (data/dossiers)
  return NextResponse.json({ situations: situations.map(s => dossiers.has(s.slug) ? { ...s, dossier: true } : s), lastFetch: getLastFetchTime() });
}
