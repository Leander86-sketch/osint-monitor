import fs from 'fs';
import path from 'path';

// DeepStateMap assessed Russian-occupied territory of Ukraine.
//
// Sinds 23 sep 2026 rechtstreeks van deepstatemap.live (api/history/last: de actuele kaart, meerdere keren
// per dag bijgewerkt). De open mirror op GitHub (cyterat/deepstate-map-data, één gzipped FeatureCollection met
// de hele historie, dagelijks) blijft als terugval wanneer de site niet antwoordt.
//
// Van de directe kaart nemen we alleen de polygonen die er voor ons toe doen:
//   occupied = "Окуповано" + Krim + ORDLO + Tuzla (rood)
//   unknown  = "Статус невідомий" (grijze zone, status onbekend)
// Bevrijd gebied en de bezette gebieden buiten Oekraïne (Transnistrië, Abchazië, Karelië…) laten we weg.

const DIRECT_URL = 'https://deepstatemap.live/api/history/last';
const MIRROR_URL = 'https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/deepstate-map-data.geojson.gz';
const CACHE_MS = 2 * 60 * 60_000;
const DISK_CACHE = path.join(process.cwd(), 'data', 'frontline-cache.json');

export interface FrontlineData {
  date: string;            // stand van de kaart (direct: "YYYY-MM-DD HH:MM", mirror: "YYYY-MM-DD")
  fetchedAt: number;
  geojson: unknown;        // FeatureCollection; properties.kind = 'occupied' | 'unknown'
  etag?: string;
  origin?: 'deepstatemap.live' | 'mirror';
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

const UA = { 'user-agent': 'ARGUS/1.0 (argus.prototipo.nl)' };

interface DsFeature { type: 'Feature'; geometry?: { type?: string }; properties?: Record<string, unknown> }

const OCCUPIED_RE = /Окуповано|Окупований Крим|ОРДЛО|Тузла/;
const UNKNOWN_RE = /Статус невідомий/;

// "23.09 o 09:38" → "2026-09-23 09:38" (jaar erbij; een maand in de toekomst = vorig jaar)
function parseDsDate(s: string): string {
  const m = /^(\d{2})\.(\d{2})\D+(\d{2}):(\d{2})/.exec(s || '');
  if (!m) return new Date().toISOString().slice(0, 10);
  const now = new Date(); let year = now.getFullYear();
  if (parseInt(m[2], 10) > now.getMonth() + 1) year -= 1;
  return `${year}-${m[2]}-${m[1]} ${m[3]}:${m[4]}`;
}

async function fetchDirect(): Promise<FrontlineData | null> {
  try {
    const res = await fetch(DIRECT_URL, { headers: UA, signal: AbortSignal.timeout(60000) });
    if (!res.ok) return null;
    const j = await res.json() as { map?: { type?: string; features?: DsFeature[] }; datetime?: string };
    const feats = j?.map?.features;
    if (!Array.isArray(feats) || feats.length < 50) return null;
    const out: DsFeature[] = [];
    for (const f of feats) {
      if (f.geometry?.type !== 'Polygon' && f.geometry?.type !== 'MultiPolygon') continue;
      const name = String(f.properties?.name || '');
      const kind = OCCUPIED_RE.test(name) ? 'occupied' : UNKNOWN_RE.test(name) ? 'unknown' : null;
      if (!kind) continue;
      out.push({ type: 'Feature', geometry: f.geometry, properties: { kind, name: name.split('///')[1]?.trim() || name } });
    }
    if (out.length < 5) return null;
    return { date: parseDsDate(j.datetime || ''), fetchedAt: Date.now(), geojson: { type: 'FeatureCollection', features: out }, origin: 'deepstatemap.live' };
  } catch {
    return null;
  }
}

interface GeoFeature { type?: string; geometry?: unknown; properties?: { date?: string } }

async function fetchMirror(): Promise<FrontlineData | null> {
  const prev = g.__frontline!.data;
  try {
    const headers: Record<string, string> = { ...UA };
    if (prev?.etag && prev.origin === 'mirror') headers['if-none-match'] = prev.etag;

    const res = await fetch(MIRROR_URL, { headers, signal: AbortSignal.timeout(60000) });
    if (res.status === 304 && prev) {
      return { ...prev, fetchedAt: Date.now() };
    }
    if (!res.ok) return null;

    const gz = Buffer.from(await res.arrayBuffer());
    const { gunzipSync } = await import('zlib');
    const parsed = JSON.parse(gunzipSync(gz).toString('utf8'));
    if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) return null;

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
      geojson: { type: 'FeatureCollection', features: feats.filter(f => f.properties?.date === newest).map(f => ({ ...f, properties: { ...f.properties, kind: 'occupied' } })) },
      etag: res.headers.get('etag') || undefined,
      origin: 'mirror',
    };
  } catch {
    return null;
  }
}

async function fetchLatest(): Promise<FrontlineData | null> {
  return (await fetchDirect()) || (await fetchMirror());
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
