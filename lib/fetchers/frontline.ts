import fs from 'fs';
import path from 'path';

// DeepStateMap assessed Russian-occupied territory of Ukraine.
// Daily GeoJSON mirror: github.com/cyterat/deepstate-map-data (03:00 UTC).
// One file per day: data/deepstatemap_data_YYYYMMDD.geojson (~78 KB MultiPolygon).

const RAW_BASE = 'https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data';
const CACHE_MS = 6 * 60 * 60_000; // re-check twice per update cycle
const DISK_CACHE = path.join(process.cwd(), 'data', 'frontline-cache.json');

export interface FrontlineData {
  date: string;            // YYYY-MM-DD of the DeepState file served
  fetchedAt: number;
  geojson: unknown;        // FeatureCollection (MultiPolygon)
}

const g = globalThis as unknown as { __frontline?: { data: FrontlineData | null; lastAttempt: number } };
if (!g.__frontline) g.__frontline = { data: null, lastAttempt: 0 };

function loadDisk(): FrontlineData | null {
  try {
    return JSON.parse(fs.readFileSync(DISK_CACHE, 'utf8')) as FrontlineData;
  } catch {
    return null;
  }
}

function saveDisk(d: FrontlineData): void {
  try {
    fs.writeFileSync(DISK_CACHE, JSON.stringify(d));
  } catch { /* non-fatal */ }
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchLatest(): Promise<FrontlineData | null> {
  // Try today, then walk back up to 7 days (file appears at 03:00 UTC)
  for (let back = 0; back < 7; back++) {
    const d = new Date(Date.now() - back * 86400000);
    const stamp = ymd(d);
    try {
      const res = await fetch(`${RAW_BASE}/deepstatemap_data_${stamp}.geojson`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const geojson = await res.json();
      if (!geojson || geojson.type !== 'FeatureCollection') continue;
      return {
        date: `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`,
        fetchedAt: Date.now(),
        geojson,
      };
    } catch { /* try previous day */ }
  }
  return null;
}

export async function getFrontline(): Promise<FrontlineData | null> {
  const st = g.__frontline!;
  if (!st.data) st.data = loadDisk();
  const fresh = st.data && Date.now() - st.data.fetchedAt < CACHE_MS;
  if (fresh) return st.data;

  // Serve stale immediately; refresh in the background at most once per 10 min
  if (Date.now() - st.lastAttempt > 10 * 60_000) {
    st.lastAttempt = Date.now();
    void fetchLatest().then(d => {
      if (d) { st.data = d; saveDisk(d); }
    });
  }
  return st.data;
}
