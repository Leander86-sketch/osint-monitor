import { NextResponse } from 'next/server';

// EU Sanctions Map API — free, no key needed
// Provides all EU/UN sanctions regimes with country targeting

interface SanctionRegime {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  adoptedBy: string;
  lastAmended: string;
  hasLists: boolean;
  programme: string[];
}

const CACHE_MS = 60 * 60_000; // 1 hour
let cache: { data: SanctionRegime[]; ts: number } = { data: [], ts: 0 };

async function fetchSanctions(): Promise<SanctionRegime[]> {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  try {
    const res = await fetch('https://www.sanctionsmap.eu/api/v1/regime', {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`EU Sanctions ${res.status}`);
    const json = await res.json();

    const regimes: SanctionRegime[] = (json.data || []).map((r: Record<string, unknown>) => {
      const country = r.country as Record<string, Record<string, string>> | null;
      const adoptedBy = r.adopted_by as Record<string, Record<string, string>> | null;
      return {
        id: r.id,
        name: (r.specification as string || '').slice(0, 200),
        country: country?.data?.title || 'Thematic',
        countryCode: country?.data?.code || '',
        adoptedBy: adoptedBy?.data?.title || 'EU',
        lastAmended: r.amendment ? new Date((r.amendment as number) * 1000).toISOString() : '',
        hasLists: !!r.has_lists,
        programme: (r.programme as string[]) || [],
      };
    });

    // Sort by most recently amended
    regimes.sort((a, b) => new Date(b.lastAmended).getTime() - new Date(a.lastAmended).getTime());

    if (regimes.length > 0) {
      cache = { data: regimes, ts: Date.now() };
    }
    return regimes;
  } catch (err) {
    console.error('[Sanctions] Fetch failed:', err);
    return cache.data;
  }
}

export async function GET() {
  const regimes = await fetchSanctions();
  return NextResponse.json({
    regimes,
    count: regimes.length,
    source: 'EU Sanctions Map (sanctionsmap.eu)',
  });
}
