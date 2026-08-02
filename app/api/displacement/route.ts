import { NextResponse } from 'next/server';

// UNHCR Population Statistics API — displacement data
// Free, no API key needed

interface DisplacementData {
  country: string;
  iso: string;
  lat: number;
  lng: number;
  refugees: number;
  idps: number;
  asylumSeekers: number;
  total: number;
}

const CACHE_MS = 60 * 60_000; // 1 hour (data is annual)
let cache: { data: DisplacementData[]; ts: number } = { data: [], ts: 0 };

// Country centroids for mapping
const COUNTRY_COORDS: Record<string, [number, number]> = {
  AFG: [33.94, 67.71], SYR: [34.80, 38.99], UKR: [48.38, 31.17],
  SDN: [12.86, 30.22], COD: [-4.04, 21.76], SOM: [5.15, 46.20],
  MMR: [21.92, 95.96], VEN: [6.42, -66.59], SSD: [6.88, 31.31],
  YEM: [15.55, 48.52], NGA: [9.08, 8.68], ETH: [9.15, 40.49],
  IRQ: [33.22, 43.68], COL: [4.57, -74.30], MOZ: [-18.67, 35.53],
  LBY: [26.34, 17.23], MLI: [17.57, -4.00], BFA: [12.24, -1.56],
  NER: [17.61, 8.08], TCD: [15.45, 18.73], CMR: [7.37, 12.35],
  PSE: [31.95, 35.30], LBN: [33.85, 35.86], JOR: [30.59, 36.24],
  TUR: [38.96, 35.24], KEN: [-0.02, 37.91], UGA: [1.37, 32.29],
  BGD: [23.68, 90.36], PAK: [30.38, 69.35], IRN: [32.43, 53.69],
  EGY: [26.82, 30.80], HTI: [18.97, -72.29], MEX: [23.63, -102.55],
  CAF: [6.61, 20.94], ERI: [15.18, 39.78],
};

async function fetchDisplacement(): Promise<DisplacementData[]> {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  try {
    // Fetch origin countries with most displacement
    const res = await fetch(
      'https://api.unhcr.org/population/v1/population/?limit=100&year=2024&coo_all=true',
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`UNHCR ${res.status}`);
    const data = await res.json();

    const results: DisplacementData[] = [];
    for (const item of data.items || []) {
      // UNHCR API returns these as strings - coerce or totals become string concatenation
      const refugees = Number(item.refugees) || 0;
      const idps = Number(item.idps) || 0;
      const asylumSeekers = Number(item.asylum_seekers) || 0;
      const total = refugees + idps + asylumSeekers;

      // Only include countries with significant displacement (>10k)
      if (total < 10000) continue;

      const iso = item.coo_iso || '';
      const coords = COUNTRY_COORDS[iso];
      if (!coords) continue;

      results.push({
        country: item.coo_name || iso,
        iso,
        lat: coords[0],
        lng: coords[1],
        refugees,
        idps,
        asylumSeekers,
        total,
      });
    }

    // Sort by total displacement
    results.sort((a, b) => b.total - a.total);

    if (results.length > 0) {
      cache = { data: results, ts: Date.now() };
    }
    return results;
  } catch (err) {
    console.error('[UNHCR] Fetch failed:', err);
    return cache.data;
  }
}

export async function GET() {
  const data = await fetchDisplacement();
  const globalTotal = data.reduce((sum, d) => sum + d.total, 0);
  return NextResponse.json({
    displacement: data,
    count: data.length,
    globalTotal,
  });
}
