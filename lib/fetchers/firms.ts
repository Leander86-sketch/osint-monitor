import { FirePoint } from '../types';

const KEY = process.env.FIRMS_MAP_KEY || '';
// Conflict theatres only (w,s,e,n) so we don't pull every global wildfire.
const REGIONS: [number, number, number, number][] = [
  [33, 12, 60, 42],  // Middle East / Gulf / Red Sea
  [22, 44, 42, 53],  // Ukraine / Black Sea
  [-10, 34, 28, 60], // Europe: Iberia, France, Benelux, Italy, Balkans, Greece
];

let cache: { ts: number; value: FirePoint[] } = { ts: 0, value: [] };

export async function fetchFirms(): Promise<FirePoint[]> {
  if (!KEY) return [];
  if (cache.value.length && Date.now() - cache.ts < 1800000) return cache.value;
  const out: FirePoint[] = [];
  const seen = new Set<string>(); // regions overlap slightly - dedup detections by id
  for (const [w, s, e, n] of REGIONS) {
    try {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${KEY}/VIIRS_SNPP_NRT/${w},${s},${e},${n}/1`;
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const text = await r.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) continue;
      const h = lines[0].split(',');
      const li = h.indexOf('latitude'), gi = h.indexOf('longitude'), ci = h.indexOf('confidence'), fi = h.indexOf('frp'), di = h.indexOf('acq_date'), ti = h.indexOf('acq_time');
      for (let k = 1; k < lines.length; k++) {
        const c = lines[k].split(',');
        const lat = parseFloat(c[li]), lng = parseFloat(c[gi]);
        if (isNaN(lat) || isNaN(lng)) continue;
        const conf = c[ci];
        if (conf === 'l') continue; // drop low-confidence
        const id = `firms-${lat.toFixed(3)}-${lng.toFixed(3)}-${c[ti] || k}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, lat, lng, frp: parseFloat(c[fi]) || 0, confidence: conf, date: ((c[di] || '') + ' ' + (c[ti] || '')).trim() });
      }
    } catch (err) { console.error('[firms] region failed', err); }
  }
  out.sort((a, b) => b.frp - a.frp);
  cache = { ts: Date.now(), value: out.slice(0, 900) };
  return cache.value;
}
