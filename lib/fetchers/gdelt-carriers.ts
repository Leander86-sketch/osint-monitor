import { CarrierGroup } from '../types';
import { getStore } from '../layer-store';
import { enqueueGdeltRequest } from '../gdelt-queue';

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
export const CARRIERS_CACHE_MS = 12 * 60 * 60_000; // 12 hours

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

export const DEPLOYMENT_REGIONS: Record<string, { lat: number; lng: number }> = {
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
export const KNOWN_POSITIONS: CarrierGroup[] = [
  // Refreshed 2026-08-02 from USNI Fleet Tracker (Jul 27) + TWZ (Jul 20/28)
  { id: 'CVN-73', name: 'USS George Washington', hullNumber: 'CVN-73', lat: 16.07, lng: 108.22, region: 'Da Nang, Vietnam (port visit)', lastSeen: '2026-07-30', source: 'USNI News', sourceUrl: 'https://news.usni.org/category/fleet-tracker' },
  { id: 'CVN-72', name: 'USS Abraham Lincoln', hullNumber: 'CVN-72', lat: 15.0, lng: 63.0, region: 'Arabian Sea', lastSeen: '2026-07-27', source: 'USNI Fleet Tracker', sourceUrl: 'https://news.usni.org/category/fleet-tracker' },
  { id: 'CVN-77', name: 'USS George H.W. Bush', hullNumber: 'CVN-77', lat: 14.5, lng: 64.2, region: 'Arabian Sea', lastSeen: '2026-07-27', source: 'USNI Fleet Tracker', sourceUrl: 'https://news.usni.org/category/fleet-tracker' },
  { id: 'CVN-71', name: 'USS Theodore Roosevelt', hullNumber: 'CVN-71', lat: 22.0, lng: -158.5, region: 'off Pearl Harbor (RIMPAC 2026)', lastSeen: '2026-07-27', source: 'USNI Fleet Tracker', sourceUrl: 'https://news.usni.org/category/fleet-tracker' },
  { id: 'CVN-69', name: 'USS Dwight D. Eisenhower', hullNumber: 'CVN-69', lat: 36.94, lng: -76.31, region: 'Norfolk, VA (training role)', lastSeen: '2026-07-28', source: 'USNI/TWZ', sourceUrl: 'https://news.usni.org/category/fleet-tracker' },
  { id: 'CVN-68', name: 'USS Nimitz', hullNumber: 'CVN-68', lat: 36.96, lng: -76.35, region: 'Norfolk, VA (homeport)', lastSeen: '2026-07-20', source: 'TWZ', sourceUrl: 'https://www.twz.com/sea/where-are-the-aircraft-carriers-july-20-2026' },
  { id: 'CVN-70', name: 'USS Carl Vinson', hullNumber: 'CVN-70', lat: 32.70, lng: -117.20, region: 'San Diego, CA (homeport)', lastSeen: '2026-07-20', source: 'TWZ', sourceUrl: 'https://www.twz.com/sea/where-are-the-aircraft-carriers-july-20-2026' },
  { id: 'CVN-78', name: 'USS Gerald R. Ford', hullNumber: 'CVN-78', lat: 36.81, lng: -76.30, region: 'Norfolk Naval Shipyard (maintenance)', lastSeen: '2026-07-20', source: 'TWZ', sourceUrl: 'https://www.twz.com/sea/where-are-the-aircraft-carriers-july-20-2026' },
  { id: 'CVN-76', name: 'USS Ronald Reagan', hullNumber: 'CVN-76', lat: 47.56, lng: -122.65, region: 'Puget Sound NSY, Bremerton (maintenance)', lastSeen: '2026-07-20', source: 'TWZ', sourceUrl: 'https://www.twz.com/sea/where-are-the-aircraft-carriers-july-20-2026' },
  { id: 'CVN-74', name: 'USS John C. Stennis', hullNumber: 'CVN-74', lat: 36.98, lng: -76.44, region: 'Newport News Shipbuilding (RCOH)', lastSeen: '2026-07-20', source: 'TWZ', sourceUrl: 'https://www.twz.com/sea/where-are-the-aircraft-carriers-july-20-2026' },
  { id: 'CVN-75', name: 'USS Harry S. Truman', hullNumber: 'CVN-75', lat: 37.00, lng: -76.46, region: 'Newport News Shipbuilding (RCOH)', lastSeen: '2026-07-20', source: 'TWZ', sourceUrl: 'https://www.twz.com/sea/where-are-the-aircraft-carriers-july-20-2026' },
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
  if (Date.now() - store.lastFetch < CARRIERS_CACHE_MS && store.data.length > 0) {
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
