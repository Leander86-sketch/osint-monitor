import { HazardEvent } from '../types';

let cache: { ts: number; value: HazardEvent[] } = { ts: 0, value: [] };

export async function fetchHazards(): Promise<HazardEvent[]> {
  if (cache.value.length && Date.now() - cache.ts < 1800000) return cache.value;
  const out: HazardEvent[] = [];

  // USGS earthquakes M4.5+ last day (GeoJSON, no key)
  try {
    const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', { signal: AbortSignal.timeout(10000) });
    const d = await r.json();
    for (const f of (d.features || [])) {
      const c = f.geometry && f.geometry.coordinates;
      const p = f.properties || {};
      if (!c || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
      out.push({ id: 'usgs-' + f.id, kind: 'earthquake', lat: c[1], lng: c[0], title: p.title || p.place || 'Earthquake', magnitude: typeof p.mag === 'number' ? p.mag : null, alert: p.alert || null, date: new Date(p.time || Date.now()).toISOString(), url: p.url || '' });
    }
  } catch (e) { console.error('[hazards] USGS failed', e); }

  // GDACS active disasters (GeoJSON, no key)
  try {
    const r = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP', { signal: AbortSignal.timeout(10000) });
    const d = await r.json();
    for (const f of (d.features || [])) {
      const c = f.geometry && f.geometry.coordinates;
      const p = f.properties || {};
      if (!c || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
      const u = typeof p.url === 'string' ? p.url : (p.url && p.url.report) || '';
      out.push({ id: 'gdacs-' + (p.eventid || (c[0] + '_' + c[1])), kind: p.eventtype || 'hazard', lat: c[1], lng: c[0], title: p.name || p.htmldescription || 'Disaster', magnitude: null, alert: p.alertlevel || null, date: p.fromdate || new Date().toISOString(), url: u });
    }
  } catch (e) { console.error('[hazards] GDACS failed', e); }

  // EMSC (seismicportal.eu) - faster than USGS for Europe/Mediterranean; dedup against USGS
  try {
    const start = new Date(Date.now() - 86400000).toISOString();
    const r = await fetch(`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minmag=4.5&limit=100&start=${encodeURIComponent(start)}`, { signal: AbortSignal.timeout(10000) });
    const d = await r.json();
    const usgsQuakes = out.filter(h => h.kind === 'earthquake');
    for (const f of (d.features || [])) {
      const c = f.geometry && f.geometry.coordinates;
      const p = f.properties || {};
      if (!c || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
      const lat = c[1], lng = c[0];
      const t = new Date(p.time || 0).getTime();
      // Same quake already reported by USGS? (within ~0.7deg and 5 min)
      const dup = usgsQuakes.some(u => Math.abs(u.lat - lat) < 0.7 && Math.abs(u.lng - lng) < 0.7 && Math.abs(new Date(u.date).getTime() - t) < 300000);
      if (dup) continue;
      const mag = typeof p.mag === 'number' ? p.mag : null;
      out.push({ id: 'emsc-' + (p.unid || p.source_id || `${lat}_${lng}_${t}`), kind: 'earthquake', lat, lng, title: `M${mag ?? '?'} - ${p.flynn_region || 'Earthquake'} (EMSC)`, magnitude: mag, alert: null, date: new Date(p.time || Date.now()).toISOString(), url: p.unid ? `https://www.seismicportal.eu/eventdetails.html?unid=${p.unid}` : 'https://www.seismicportal.eu' });
    }
  } catch (e) { console.error('[hazards] EMSC failed', e); }

  cache = { ts: Date.now(), value: out };
  return out;
}
