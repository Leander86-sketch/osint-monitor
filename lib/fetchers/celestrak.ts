import { Satellite } from '../types';
import { getStore } from '../layer-store';
import * as satellite from 'satellite.js';

const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
// TLEs persist on disk: restarts must NOT trigger a refetch (CelesTrak 403-blocks
// IPs that re-download the full catalog; slightly stale TLEs are fine to plot).
import fs from 'fs';
import path from 'path';
const TLE_DISK = path.join(process.cwd(), 'data', 'tle-cache.json');
const TLE_STALE_OK_MS = 7 * 24 * 60 * 60_000;
function loadTleDisk(): { ts: number; tles: string } | null {
  try { return JSON.parse(fs.readFileSync(TLE_DISK, 'utf8')); } catch { return null; }
}
function saveTleDisk(tles: string): void {
  try { fs.writeFileSync(TLE_DISK, JSON.stringify({ ts: Date.now(), tles })); } catch { /* non-fatal */ }
}
const TLE_CACHE_MS = 24 * 60 * 60_000; // 24 hours (CelesTrak fair use policy)
const PROPAGATION_CACHE_MS = 10_000; // 10 seconds

// Notable satellite categories for filtering
const NOTABLE_PATTERNS = [
  /^ISS/i,
  /^STARLINK/i,
  /^GPS/i,
  /^COSMOS/i,
  /^NOAA/i,
  /^GOES/i,
  /^LANDSAT/i,
  /^SENTINEL/i,
  /^TIANGONG/i,
  /^HUBBLE/i,
  /^JAMES WEBB/i,
];

const MAX_SATELLITES = 100; // Reduced for performance

function parseTLEs(raw: string): Array<{ name: string; tle1: string; tle2: string }> {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const tles: Array<{ name: string; tle1: string; tle2: string }> = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const tle1 = lines[i + 1];
    const tle2 = lines[i + 2];
    if (tle1?.startsWith('1 ') && tle2?.startsWith('2 ')) {
      tles.push({ name, tle1, tle2 });
    }
  }

  return tles;
}

function propagateSatellite(
  name: string,
  tle1: string,
  tle2: string
): Satellite | null {
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    const now = new Date();
    const posVel = satellite.propagate(satrec, now);
    if (!posVel || !posVel.position || typeof posVel.position === 'boolean') return null;

    const pos = posVel.position as satellite.EciVec3<number>;
    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(pos, gmst);

    const lat = satellite.degreesLat(geo.latitude);
    const lng = satellite.degreesLong(geo.longitude);
    const alt = geo.height; // km

    if (isNaN(lat) || isNaN(lng)) return null;

    // Calculate speed from velocity
    let speed = 0;
    if (posVel.velocity && typeof posVel.velocity !== 'boolean') {
      const vel = posVel.velocity as satellite.EciVec3<number>;
      speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2); // km/s
    }

    // Extract NORAD ID from TLE
    const noradId = parseInt(tle1.substring(2, 7).trim(), 10);

    return {
      id: `sat-${noradId}`,
      name: name.trim(),
      lat,
      lng,
      altitude: alt,
      speed: Math.round(speed * 3600), // km/h
      heading: 0,
      noradId,
      intlDesignator: tle1.substring(9, 17).trim(),
    };
  } catch {
    return null;
  }
}

export async function fetchSatellites(): Promise<Satellite[]> {
  const store = getStore().satellites;

  // Check propagation cache (10s)
  if (Date.now() - store.lastFetch < PROPAGATION_CACHE_MS && store.data.length > 0) {
    return store.data;
  }

  // Cold start: reuse on-disk TLEs first (up to 7 days old) before hitting CelesTrak
  if (!store.tles) {
    const disk = loadTleDisk();
    if (disk && Date.now() - disk.ts < TLE_STALE_OK_MS) {
      store.tles = disk.tles;
      store.lastTleFetch = disk.ts;
    }
  }

  // Fetch TLEs if needed (24h cache)
  if (!store.tles || Date.now() - store.lastTleFetch > TLE_CACHE_MS) {
    try {
      const res = await fetch(CELESTRAK_URL, {
        headers: { 'User-Agent': 'OSINT-Monitor/1.0' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`CelesTrak ${res.status}`);
      store.tles = await res.text();
      store.lastTleFetch = Date.now();
      saveTleDisk(store.tles);
    } catch (err) {
      console.error('[CelesTrak] TLE fetch failed:', err);
      // Keep serving whatever TLEs we have (disk or memory); retry in 1h, not every call
      if (store.tles) {
        store.lastTleFetch = Date.now() - TLE_CACHE_MS + 60 * 60_000;
      } else {
        return store.data;
      }
    }
  }

  // Parse and filter TLEs
  const allTles = parseTLEs(store.tles);

  // Prioritize notable satellites, then sample the rest
  const notable = allTles.filter(t =>
    NOTABLE_PATTERNS.some(p => p.test(t.name))
  );
  const others = allTles.filter(t =>
    !NOTABLE_PATTERNS.some(p => p.test(t.name))
  );

  // Take all notable + random sample of others
  const remaining = MAX_SATELLITES - notable.length;
  const sampled = others
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, remaining));

  const selected = [...notable, ...sampled];

  // Propagate positions
  const satellites: Satellite[] = [];
  for (const tle of selected) {
    const sat = propagateSatellite(tle.name, tle.tle1, tle.tle2);
    if (sat) {
      sat.tle1 = tle.tle1;
      sat.tle2 = tle.tle2;
      satellites.push(sat);
    }
  }

  store.data = satellites;
  store.lastFetch = Date.now();

  return satellites;
}
