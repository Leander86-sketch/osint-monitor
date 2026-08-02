import fs from 'fs';
import path from 'path';
import { CarrierGroup } from '../types';
import { KNOWN_POSITIONS, DEPLOYMENT_REGIONS } from './gdelt-carriers';

// Weekly USNI "Fleet and Marine Tracker" via the site RSS feed - the article
// pages 403 behind Cloudflare, but news.usni.org/feed serves the FULL article
// text in content:encoded. Parse carrier mentions per region section.

const FEED_URL = 'https://news.usni.org/feed';
const CACHE_MS = 24 * 3600_000;
const DISK_CACHE = path.join(process.cwd(), 'data', 'carriers-usni.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const HULL_NAMES: Record<string, string> = {
  'CVN-68': 'USS Nimitz', 'CVN-69': 'USS Dwight D. Eisenhower', 'CVN-70': 'USS Carl Vinson',
  'CVN-71': 'USS Theodore Roosevelt', 'CVN-72': 'USS Abraham Lincoln', 'CVN-73': 'USS George Washington',
  'CVN-74': 'USS John C. Stennis', 'CVN-75': 'USS Harry S. Truman', 'CVN-76': 'USS Ronald Reagan',
  'CVN-77': 'USS George H.W. Bush', 'CVN-78': 'USS Gerald R. Ford',
};

interface UsniCache { ts: number; edition: string; groups: CarrierGroup[] }

function loadDisk(): UsniCache | null {
  try { return JSON.parse(fs.readFileSync(DISK_CACHE, 'utf8')); } catch { return null; }
}
function saveDisk(c: UsniCache): void {
  try { fs.writeFileSync(DISK_CACHE, JSON.stringify(c)); } catch { /* non-fatal */ }
}

function matchRegion(header: string): { lat: number; lng: number } | null {
  const lower = header.toLowerCase();
  for (const [region, coords] of Object.entries(DEPLOYMENT_REGIONS)) {
    if (lower.includes(region)) return coords;
  }
  return null;
}

function parseTracker(content: string, edition: string): CarrierGroup[] {
  // Strip tags, keep text; split into region sections on "In the <Region>" headers
  const text = content.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#8217;/g, "'");
  const sections = text.split(/\n(?=In the [A-Z])/);
  const out: CarrierGroup[] = [];
  const seen = new Set<string>();
  const perSpot = new Map<string, number>();
  for (const sec of sections) {
    const header = (sec.split('\n')[0] || '').trim();
    const coords = matchRegion(header);
    if (!coords) continue;
    for (const m of sec.matchAll(/CVN[\s-]?(\d{2})/g)) {
      const hull = `CVN-${m[1]}`;
      if (!HULL_NAMES[hull] || seen.has(hull)) continue;
      seen.add(hull);
      const spotKey = `${coords.lat},${coords.lng}`;
      const n = perSpot.get(spotKey) || 0;
      perSpot.set(spotKey, n + 1);
      out.push({
        id: hull, name: HULL_NAMES[hull], hullNumber: hull,
        lat: coords.lat + n * 0.5, lng: coords.lng + n * 0.6,
        region: header.replace(/^In the\s*/i, ''),
        lastSeen: edition,
        source: `USNI Fleet Tracker (${edition})`,
        sourceUrl: 'https://news.usni.org/category/fleet-tracker',
      });
    }
  }
  return out;
}

export async function fetchUsniCarriers(): Promise<CarrierGroup[]> {
  const disk = loadDisk();
  if (disk && Date.now() - disk.ts < CACHE_MS && disk.groups.length > 0) {
    return mergeWithFallback(disk.groups);
  }
  try {
    const res = await fetch(FEED_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`USNI feed ${res.status}`);
    const xml = await res.text();
    // Find the latest Fleet Tracker item
    const items = xml.split('<item>').slice(1);
    for (const item of items) {
      const title = (item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
      if (!/Fleet and Marine Tracker/i.test(title)) continue;
      const content = (item.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/) || [])[1] || '';
      const pub = (item.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1] || '';
      const edition = pub ? new Date(pub).toISOString().slice(0, 10) : 'recent';
      const groups = parseTracker(content, edition);
      if (groups.length >= 2) {
        saveDisk({ ts: Date.now(), edition, groups });
        console.log(`[USNI] Fleet Tracker ${edition}: ${groups.length} carriers parsed`);
        return mergeWithFallback(groups);
      }
      break; // latest tracker found but unparseable - fall through to fallback
    }
    throw new Error('no parseable Fleet Tracker item in feed');
  } catch (err) {
    console.warn('[USNI] fetch/parse failed, using fallback:', err);
    if (disk && disk.groups.length > 0) return mergeWithFallback(disk.groups);
    return KNOWN_POSITIONS;
  }
}

// USNI's weekly tracker only lists deployed/underway groups; fill the rest
// (homeport, maintenance) from the curated fallback so all 11 hulls show.
function mergeWithFallback(usni: CarrierGroup[]): CarrierGroup[] {
  const have = new Set(usni.map(g => g.hullNumber));
  return [...usni, ...KNOWN_POSITIONS.filter(k => !have.has(k.hullNumber))];
}
