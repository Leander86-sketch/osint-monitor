import fs from 'fs';
import path from 'path';

// DeepStateMap assessed Russian-occupied territory of Ukraine.
// Mirror: github.com/cyterat/deepstate-map-data.
//
// De mirror is medio 2026 van vorm veranderd: de losse dagbestanden onder data/
// lopen door tot juli 2024 en daarna niet meer. Alles zit nu in één gzipped
// FeatureCollection in de repo-root, met de hele historie erin (stand 7 sep 2026:
// 785 features over 283 dagen). De oude fetcher liep daardoor stil op 404's en
// serveerde eindeloos zijn last-good cache.
//
// We halen dat bestand op, houden alleen de nieuwste datum over voor de kaart,
// en onthouden de ETag zodat een ongewijzigd bestand geen 20 MB kost.

const SRC_URL = 'https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/deepstate-map-data.geojson.gz';
const CACHE_MS = 6 * 60 * 60_000; // re-check twice per update cycle
const DISK_CACHE = path.join(process.cwd(), 'data', 'frontline-cache.json');

export interface FrontlineData {
  date: string;            // YYYY-MM-DD of the newest DeepState snapshot
  fetchedAt: number;
  geojson: unknown;        // FeatureCollection (MultiPolygon), newest day only
  etag?: string;
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

interface GeoFeature { properties?: { date?: string } }

async function fetchLatest(): Promise<FrontlineData | null> {
  const prev = g.__frontline!.data;
  try {
    const headers: Record<string, string> = { 'user-agent': 'ARGUS/1.0 (argus.prototipo.nl)' };
    if (prev?.etag) headers['if-none-match'] = prev.etag;

    const res = await fetch(SRC_URL, { headers, signal: AbortSignal.timeout(60000) });
    if (res.status === 304 && prev) {
      // Niets veranderd: de cache blijft geldig, alleen de klok gaat vooruit.
      return { ...prev, fetchedAt: Date.now() };
    }
    if (!res.ok) return null;

    const gz = Buffer.from(await res.arrayBuffer());
    const { gunzipSync } = await import('zlib');
    const parsed = JSON.parse(gunzipSync(gz).toString('utf8'));
    if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) return null;

    // Alle dagen zitten in één bestand; de kaart wil alleen de meest recente.
    const feats = parsed.features as GeoFeature[];
    let newest = '';
    for (const f of feats) {
      const d = f.properties?.date;
      if (d && d > newest) newest = d;
    }
    if (!newest) return null;

    return {
      date: newest.slice(0, 10),
      fetchedAt: Date.now(),
      geojson: { type: 'FeatureCollection', features: feats.filter(f => f.properties?.date === newest) },
      etag: res.headers.get('etag') || undefined,
    };
  } catch {
    return null;
  }
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
