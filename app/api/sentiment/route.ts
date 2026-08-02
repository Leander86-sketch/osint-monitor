import { NextResponse } from 'next/server';
import { enqueueGdeltRequest } from '@/lib/gdelt-queue';
import fs from 'fs';
import path from 'path';

// GDELT GKG Tone-based sentiment for conflict regions
// Free, no API key, updates every 15 minutes

interface SentimentPoint {
  lat: number;
  lng: number;
  name: string;
  tone: number;       // negative = bad, positive = good
  articles: number;
  topTheme: string;
}

const CACHE_MS = 15 * 60_000; // 15 minutes per region
const DISK_CACHE = path.join(process.cwd(), 'data', 'sentiment-cache.json');

// Survive restarts: GDELT fills slowly (1 req/6s + 429 backoff), so an
// in-memory-only cache would reset to an empty TONE layer on every deploy.
function loadDisk(): Map<string, { point: SentimentPoint | null; ts: number }> {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(DISK_CACHE, 'utf8'))));
  } catch {
    return new Map();
  }
}
function saveDisk(m: Map<string, { point: SentimentPoint | null; ts: number }>): void {
  try { fs.writeFileSync(DISK_CACHE, JSON.stringify(Object.fromEntries(m))); } catch { /* non-fatal */ }
}

const regionCache = loadDisk();
let refreshing = false;

// Regions to query sentiment for
const SENTIMENT_REGIONS: { name: string; query: string; lat: number; lng: number }[] = [
  { name: 'Gaza', query: 'gaza', lat: 31.35, lng: 34.31 },
  { name: 'Israel', query: 'israel', lat: 31.77, lng: 35.21 },
  { name: 'Iran', query: 'iran', lat: 35.69, lng: 51.39 },
  { name: 'Ukraine', query: 'ukraine', lat: 48.38, lng: 31.17 },
  { name: 'Russia', query: 'russia', lat: 55.76, lng: 37.62 },
  { name: 'Syria', query: 'syria', lat: 34.80, lng: 39.00 },
  { name: 'Sudan', query: 'sudan', lat: 12.86, lng: 30.22 },
  { name: 'Yemen', query: 'yemen', lat: 15.55, lng: 48.52 },
  { name: 'Lebanon', query: 'lebanon', lat: 33.85, lng: 35.86 },
  { name: 'Taiwan', query: 'taiwan', lat: 23.70, lng: 120.96 },
  { name: 'North Korea', query: '"north korea"', lat: 40.34, lng: 127.51 },
  { name: 'Myanmar', query: 'myanmar', lat: 21.92, lng: 95.96 },
  { name: 'Ethiopia', query: 'ethiopia', lat: 9.15, lng: 40.49 },
  { name: 'Somalia', query: 'somalia', lat: 5.15, lng: 46.20 },
  { name: 'Libya', query: 'libya', lat: 26.34, lng: 17.23 },
  { name: 'Iraq', query: 'iraq', lat: 33.22, lng: 43.68 },
  { name: 'Afghanistan', query: 'afghanistan', lat: 33.94, lng: 67.71 },
  { name: 'Pakistan', query: 'pakistan', lat: 30.38, lng: 69.35 },
  { name: 'Congo', query: 'congo', lat: -4.04, lng: 21.76 },
  { name: 'Mali', query: 'mali', lat: 17.57, lng: -4.00 },
  { name: 'South China Sea', query: '"south china sea"', lat: 12.00, lng: 114.00 },
  { name: 'Red Sea', query: '"red sea"', lat: 20.00, lng: 38.00 },
];

async function fetchSentimentForRegion(region: typeof SENTIMENT_REGIONS[0]): Promise<SentimentPoint | null> {
  try {
    const params = new URLSearchParams({
      query: region.query,
      mode: 'tonechart',
      format: 'json',
      timespan: '24h',
    });
    const res = await enqueueGdeltRequest(() =>
      fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, { signal: AbortSignal.timeout(15000) })
    );
    if (!res.ok) return null;
    const data = await res.json();

    // ToneChart returns { tonechart: [{ bin: number, count: number }] }
    const bins = data.tonechart || [];
    if (bins.length === 0) return null;

    let totalTone = 0;
    let totalCount = 0;
    for (const bin of bins) {
      totalTone += (bin.bin || 0) * (bin.count || 0);
      totalCount += bin.count || 0;
    }
    const avgTone = totalCount > 0 ? totalTone / totalCount : 0;

    return {
      lat: region.lat,
      lng: region.lng,
      name: region.name,
      tone: Math.round(avgTone * 100) / 100,
      articles: totalCount,
      topTheme: region.query.replace(/"/g, ''),
    };
  } catch {
    return null;
  }
}

// Refresh at most 6 stale regions per pass, oldest first; the shared queue paces to 1 req/6s.
async function refreshStaleRegions(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const now = Date.now();
    const stale = SENTIMENT_REGIONS
      .filter(r => now - (regionCache.get(r.name)?.ts || 0) > CACHE_MS)
      .sort((a, b) => (regionCache.get(a.name)?.ts || 0) - (regionCache.get(b.name)?.ts || 0))
      .slice(0, 6);
    let changed = false;
    for (const region of stale) {
      const point = await fetchSentimentForRegion(region);
      regionCache.set(region.name, { point, ts: Date.now() });
      changed = true;
    }
    if (changed) saveDisk(regionCache);
  } finally {
    refreshing = false;
  }
}

export async function GET() {
  // Serve the cache immediately; fill/refresh it in the background
  void refreshStaleRegions();
  const sentiment = [...regionCache.values()]
    .map(e => e.point)
    .filter((p): p is SentimentPoint => p !== null && p.articles > 0);
  return NextResponse.json({ sentiment, count: sentiment.length, cached: true });
}
