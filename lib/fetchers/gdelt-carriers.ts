import { CarrierGroup } from '../types';
import { getStore } from '../layer-store';
import { enqueueGdeltRequest } from '../gdelt-queue';

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const CACHE_MS = 12 * 60 * 60_000; // 12 hours

interface CarrierRegistry {
  name: string;
  hull: string;
  searchTerms: string[];
}

const CARRIERS: CarrierRegistry[] = [
  { name: 'USS Gerald R. Ford', hull: 'CVN-78', searchTerms: ['CVN-78', 'USS Ford', 'Gerald Ford carrier', 'gerald r. ford'] },
  { name: 'USS Dwight D. Eisenhower', hull: 'CVN-69', searchTerms: ['CVN-69', 'USS Eisenhower', 'Eisenhower carrier'] },
  { name: 'USS Abraham Lincoln', hull: 'CVN-72', searchTerms: ['CVN-72', 'USS Lincoln', 'Abraham Lincoln carrier', 'lincoln carrier strike'] },
  { name: 'USS Theodore Roosevelt', hull: 'CVN-71', searchTerms: ['CVN-71', 'USS Roosevelt', 'Theodore Roosevelt carrier'] },
  { name: 'USS Harry S. Truman', hull: 'CVN-75', searchTerms: ['CVN-75', 'USS Truman', 'Truman carrier'] },
  { name: 'USS Ronald Reagan', hull: 'CVN-76', searchTerms: ['CVN-76', 'USS Reagan', 'Ronald Reagan carrier'] },
  { name: 'USS George Washington', hull: 'CVN-73', searchTerms: ['CVN-73', 'USS Washington carrier', 'George Washington carrier'] },
  { name: 'USS John C. Stennis', hull: 'CVN-74', searchTerms: ['CVN-74', 'USS Stennis', 'Stennis carrier'] },
  { name: 'USS Carl Vinson', hull: 'CVN-70', searchTerms: ['CVN-70', 'USS Vinson', 'Carl Vinson carrier'] },
  { name: 'USS Nimitz', hull: 'CVN-68', searchTerms: ['CVN-68', 'USS Nimitz'] },
  { name: 'USS George H.W. Bush', hull: 'CVN-77', searchTerms: ['CVN-77', 'USS Bush', 'George H.W. Bush carrier'] },
];

const DEPLOYMENT_REGIONS: Record<string, { lat: number; lng: number }> = {
  'red sea': { lat: 18.0, lng: 39.5 },
  'persian gulf': { lat: 26.5, lng: 51.5 },
  'arabian sea': { lat: 18.0, lng: 65.0 },
  'gulf of oman': { lat: 24.5, lng: 59.0 },
  'south china sea': { lat: 12.0, lng: 114.0 },
  'east china sea': { lat: 30.0, lng: 126.0 },
  'western pacific': { lat: 20.0, lng: 135.0 },
  'eastern pacific': { lat: 20.0, lng: -130.0 },
  'pacific': { lat: 25.0, lng: -160.0 },
  'mediterranean': { lat: 35.0, lng: 18.0 },
  'eastern mediterranean': { lat: 34.0, lng: 32.0 },
  'atlantic': { lat: 35.0, lng: -40.0 },
  'north atlantic': { lat: 50.0, lng: -30.0 },
  'indian ocean': { lat: -5.0, lng: 70.0 },
  'gulf of aden': { lat: 12.5, lng: 47.0 },
  'strait of hormuz': { lat: 26.5, lng: 56.5 },
  'philippine sea': { lat: 18.0, lng: 130.0 },
  'norfolk': { lat: 36.95, lng: -76.33 },
  'san diego': { lat: 32.68, lng: -117.23 },
  'yokosuka': { lat: 35.28, lng: 139.67 },
  'japan': { lat: 35.28, lng: 139.67 },
  'korea': { lat: 35.0, lng: 129.0 },
  'taiwan strait': { lat: 24.0, lng: 119.0 },
  'bab el-mandeb': { lat: 12.6, lng: 43.3 },
  'suez': { lat: 30.0, lng: 32.5 },
  'souda bay': { lat: 35.49, lng: 24.07 },
  'crete': { lat: 35.49, lng: 24.07 },
  'south america': { lat: -15.0, lng: -55.0 },
};

/**
 * Known carrier positions from USNI Fleet Tracker (updated periodically).
 * Used as fallback when GDELT doesn't return geo-matchable articles.
 * Source: USNI News Fleet and Marine Tracker
 */
const KNOWN_POSITIONS: CarrierGroup[] = [
  {
    id: 'CVN-78', name: 'USS Gerald R. Ford', hullNumber: 'CVN-78',
    lat: 35.49, lng: 24.07, region: 'Souda Bay, Crete',
    lastSeen: '2026-03-23', source: 'USNI Fleet Tracker',
    sourceUrl: 'https://news.usni.org/category/fleet-tracker',
  },
  {
    id: 'CVN-72', name: 'USS Abraham Lincoln', hullNumber: 'CVN-72',
    lat: 18.0, lng: 65.0, region: 'Arabian Sea',
    lastSeen: '2026-03-23', source: 'USNI Fleet Tracker',
    sourceUrl: 'https://news.usni.org/category/fleet-tracker',
  },
  {
    id: 'CVN-73', name: 'USS George Washington', hullNumber: 'CVN-73',
    lat: 35.28, lng: 139.67, region: 'Yokosuka, Japan',
    lastSeen: '2026-03-23', source: 'USNI Fleet Tracker',
    sourceUrl: 'https://news.usni.org/category/fleet-tracker',
  },
  {
    id: 'CVN-68', name: 'USS Nimitz', hullNumber: 'CVN-68',
    lat: 5.0, lng: -85.0, region: 'Eastern Pacific',
    lastSeen: '2026-03-23', source: 'USNI Fleet Tracker',
    sourceUrl: 'https://news.usni.org/category/fleet-tracker',
  },
];

function matchRegion(text: string): { lat: number; lng: number; region: string } | null {
  const lower = text.toLowerCase();
  for (const [region, coords] of Object.entries(DEPLOYMENT_REGIONS)) {
    if (lower.includes(region)) {
      return { ...coords, region };
    }
  }
  return null;
}

export async function fetchCarrierGroups(): Promise<CarrierGroup[]> {
  const store = getStore().carriers;
  if (Date.now() - store.lastFetch < CACHE_MS && store.data.length > 0) {
    return store.data;
  }

  try {
    const query = '("aircraft carrier" OR "carrier strike group" OR "USS Ford" OR "USS Eisenhower" OR "USS Lincoln" OR "USS Truman" OR "USS Reagan" OR "USS Nimitz" OR "USS Washington" OR "USS Vinson" OR "USS Bush")';
    const params = new URLSearchParams({
      query,
      mode: 'artlist',
      maxrecords: '250',
      format: 'json',
      sort: 'datedesc',
      timespan: '14d',
    });

    // Use global GDELT queue to avoid 429s — retry up to 3 times
    let articles: Array<{ title?: string; url?: string; seendate?: string; domain?: string }> = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await enqueueGdeltRequest(() =>
        fetch(`${GDELT_DOC_API}?${params}`, { signal: AbortSignal.timeout(25000) })
      );
      if (res.status === 429) {
        console.warn(`[GDELT Carriers] Rate limited, retry ${attempt + 1}/3`);
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      if (!res.ok) throw new Error(`GDELT Carriers ${res.status}`);
      const json = await res.json();
      articles = json.articles || [];
      break;
    }

    const carrierPositions = new Map<string, CarrierGroup>();

    for (const article of articles) {
      const combined = `${article.title || ''} ${article.url || ''}`.toLowerCase();

      for (const carrier of CARRIERS) {
        const matched = carrier.searchTerms.some(term => combined.includes(term.toLowerCase()));
        if (!matched) continue;

        // Already found this carrier? Skip (we want most recent)
        if (carrierPositions.has(carrier.hull)) continue;

        const geo = matchRegion(combined);
        if (!geo) continue;

        carrierPositions.set(carrier.hull, {
          id: carrier.hull,
          name: carrier.name,
          hullNumber: carrier.hull,
          lat: geo.lat + (Math.random() - 0.5) * 0.1,
          lng: geo.lng + (Math.random() - 0.5) * 0.1,
          region: geo.region,
          lastSeen: article.seendate || new Date().toISOString(),
          source: article.domain,
          sourceUrl: article.url,
        });
      }
    }

    // Merge with known positions — GDELT results take priority, fallback fills gaps
    for (const known of KNOWN_POSITIONS) {
      if (!carrierPositions.has(known.hullNumber)) {
        carrierPositions.set(known.hullNumber, {
          ...known,
          lat: known.lat + (Math.random() - 0.5) * 0.1,
          lng: known.lng + (Math.random() - 0.5) * 0.1,
        });
      }
    }

    const groups = Array.from(carrierPositions.values());
    store.data = groups;
    store.lastFetch = Date.now();

    console.log(`[GDELT Carriers] ${groups.length} carriers (${articles.length} articles, ${groups.length - carrierPositions.size + KNOWN_POSITIONS.length} from fallback)`);

    return groups;
  } catch (err) {
    console.error('[GDELT Carriers] Fetch failed, using known positions:', err);
    // On total failure, return known positions
    if (store.data.length === 0) {
      store.data = KNOWN_POSITIONS;
      store.lastFetch = Date.now();
    }
    return store.data;
  }
}
