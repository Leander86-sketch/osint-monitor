import { ConflictEvent } from '../types';
import { getStore } from '../layer-store';
import { enqueueGdeltRequest } from '../gdelt-queue';
import fs from 'fs';
import path from 'path';

// Restarts + GDELT 429 streaks otherwise leave this layer empty for hours
const DISK_CACHE = path.join(process.cwd(), 'data', 'conflicts-cache.json');
function loadDisk(): { ts: number; events: ConflictEvent[] } | null {
  try { return JSON.parse(fs.readFileSync(DISK_CACHE, 'utf8')); } catch { return null; }
}
function saveDisk(events: ConflictEvent[]): void {
  try { fs.writeFileSync(DISK_CACHE, JSON.stringify({ ts: Date.now(), events })); } catch { /* non-fatal */ }
}

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const CACHE_MS = 6 * 3600_000; // 6 hours

// Single query with parentheses (GDELT requires parens around OR terms)
const CONFLICT_QUERY = '(airstrike OR bombing OR missile OR shelling OR "drone strike" OR "military operation")';

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  socialimage?: string;
}

// Expanded conflict locations — sorted longest-first for specific-match priority
const CONFLICT_LOCATIONS_RAW: [string, number, number][] = [
  // Gaza Strip — specific areas
  ['khan younis', 31.346, 34.306],
  ['gaza city', 31.500, 34.470],
  ['deir al-balah', 31.418, 34.351],
  ['beit hanoun', 31.537, 34.535],
  ['beit lahia', 31.551, 34.504],
  ['jabalia', 31.528, 34.483],
  ['nuseirat', 31.441, 34.394],
  ['al-shifa', 31.518, 34.449],
  ['rafah', 31.297, 34.246],
  ['gaza', 31.355, 34.309],
  // West Bank
  ['jenin', 32.464, 35.294],
  ['nablus', 32.221, 35.254],
  ['ramallah', 31.904, 35.203],
  ['hebron', 31.533, 35.100],
  ['tulkarem', 32.310, 35.029],
  ['west bank', 31.947, 35.303],
  // Israel
  ['tel aviv', 32.085, 34.782],
  ['jerusalem', 31.768, 35.214],
  ['haifa', 32.794, 34.990],
  ['beer sheva', 31.252, 34.791],
  ['ashkelon', 31.669, 34.574],
  ['sderot', 31.525, 34.596],
  ['golan heights', 33.000, 35.750],
  ['israel', 31.046, 34.852],
  // Lebanon
  ['south lebanon', 33.272, 35.203],
  ['tyre', 33.271, 35.204],
  ['sidon', 33.563, 35.372],
  ['baalbek', 34.006, 36.216],
  ['beirut', 33.894, 35.502],
  ['lebanon', 33.855, 35.862],
  // Syria
  ['idlib', 35.930, 36.634],
  ['aleppo', 36.202, 37.134],
  ['damascus', 33.514, 36.277],
  ['deir ez-zor', 35.336, 40.146],
  ['raqqa', 35.953, 39.014],
  ['latakia', 35.517, 35.777],
  ['homs', 34.729, 36.726],
  ['daraa', 32.626, 36.106],
  ['syria', 34.802, 38.997],
  // Iran
  ['isfahan', 32.655, 51.668],
  ['tehran', 35.689, 51.389],
  ['tabriz', 38.080, 46.292],
  ['shiraz', 29.592, 52.584],
  ['bushehr', 28.922, 50.837],
  ['natanz', 33.724, 51.727],
  ['bandar abbas', 27.183, 56.267],
  ['khuzestan', 31.432, 49.040],
  ['hormuz', 27.050, 56.300],
  ['iran', 32.428, 53.688],
  // Iraq
  ['baghdad', 33.315, 44.366],
  ['mosul', 36.340, 43.130],
  ['basra', 30.508, 47.783],
  ['erbil', 36.191, 44.009],
  ['kirkuk', 35.468, 44.392],
  ['fallujah', 33.350, 43.783],
  ['iraq', 33.223, 43.679],
  // Yemen
  ['sanaa', 15.369, 44.191],
  ['aden', 12.788, 45.019],
  ['hodeida', 14.798, 42.955],
  ['marib', 15.454, 45.323],
  ['taiz', 13.579, 44.021],
  ['yemen', 15.553, 48.516],
  // Ukraine — detailed
  ['bakhmut', 48.595, 38.001],
  ['avdiivka', 48.140, 37.745],
  ['soledar', 48.676, 38.091],
  ['kharkiv', 49.994, 36.230],
  ['kherson', 46.635, 32.617],
  ['mariupol', 47.096, 37.543],
  ['zaporizhzhia', 47.839, 35.140],
  ['dnipro', 48.465, 35.046],
  ['mykolaiv', 46.975, 31.995],
  ['sumy', 50.907, 34.798],
  ['chernihiv', 51.498, 31.289],
  ['odesa', 46.483, 30.723],
  ['kramatorsk', 48.736, 37.584],
  ['pokrovsk', 48.286, 37.178],
  ['toretsk', 48.398, 37.848],
  ['donetsk', 48.016, 37.803],
  ['luhansk', 48.574, 39.308],
  ['crimea', 44.952, 34.102],
  ['sevastopol', 44.605, 33.522],
  ['kyiv', 50.450, 30.523],
  ['lviv', 49.840, 24.030],
  ['kursk', 51.737, 36.187],
  ['belgorod', 50.600, 36.586],
  ['donbas', 48.016, 37.803],
  ['ukraine', 48.379, 31.166],
  // Russia
  ['moscow', 55.756, 37.617],
  ['st petersburg', 59.934, 30.335],
  ['rostov', 47.236, 39.713],
  ['voronezh', 51.672, 39.184],
  ['bryansk', 53.244, 34.364],
  ['russia', 55.756, 37.617],
  // Africa — Sahel
  ['khartoum', 15.501, 32.560],
  ['darfur', 13.500, 25.000],
  ['port sudan', 19.617, 37.217],
  ['sudan', 12.863, 30.218],
  ['addis ababa', 8.981, 38.758],
  ['tigray', 13.500, 39.500],
  ['ethiopia', 9.145, 40.490],
  ['mogadishu', 2.047, 45.318],
  ['somalia', 5.152, 46.200],
  ['bamako', 12.640, -8.000],
  ['mali', 17.571, -3.996],
  ['niamey', 13.512, 2.113],
  ['niger', 17.608, 8.082],
  ['ouagadougou', 12.372, -1.525],
  ['burkina faso', 12.238, -1.562],
  ['tripoli', 32.887, 13.191],
  ['benghazi', 32.117, 20.087],
  ['libya', 26.335, 17.228],
  ['lagos', 6.524, 3.380],
  ['nigeria', 9.082, 8.675],
  ['goma', -1.659, 29.220],
  ['kinshasa', -4.442, 15.267],
  ['congo', -4.038, 21.759],
  ['cabo delgado', -12.500, 40.000],
  ['mozambique', -18.666, 35.530],
  // Asia-Pacific
  ['taiwan strait', 24.500, 119.500],
  ['taiwan', 23.698, 120.961],
  ['taipei', 25.033, 121.565],
  ['south china sea', 12.000, 114.000],
  ['north korea', 40.340, 127.510],
  ['pyongyang', 39.039, 125.763],
  ['myanmar', 21.916, 95.956],
  ['yangon', 16.871, 96.199],
  ['kashmir', 34.084, 74.797],
  ['pakistan', 30.375, 69.345],
  ['islamabad', 33.684, 73.048],
  ['kabul', 34.555, 69.208],
  ['afghanistan', 33.939, 67.710],
  ['philippines', 12.880, 121.774],
  ['mindanao', 7.500, 125.000],
  // Strategic locations
  ['red sea', 20.000, 38.000],
  ['bab al-mandab', 12.600, 43.320],
  ['suez canal', 30.455, 32.350],
  ['strait of hormuz', 26.567, 56.250],
  ['black sea', 43.500, 34.000],
  ['persian gulf', 26.000, 52.000],
  ['mediterranean', 35.000, 18.000],
];

const CONFLICT_LOCATIONS = CONFLICT_LOCATIONS_RAW.sort((a, b) => b[0].length - a[0].length);

function extractGeoFromTitle(title: string): { lat: number; lng: number; name: string } | null {
  const lower = title.toLowerCase();
  for (const [name, lat, lng] of CONFLICT_LOCATIONS) {
    if (lower.includes(name)) {
      return { lat, lng, name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') };
    }
  }
  return null;
}

export async function fetchGdeltConflicts(): Promise<ConflictEvent[]> {
  const store = getStore().conflicts;
  // Cold start: seed from the last-good disk snapshot (max 24h old)
  if (store.data.length === 0) {
    const disk = loadDisk();
    if (disk && Date.now() - disk.ts < 24 * 3600_000) {
      store.data = disk.events;
      store.lastFetch = disk.ts;
    }
  }
  if (Date.now() - store.lastFetch < CACHE_MS && store.data.length > 0) {
    return store.data;
  }

  try {
    const params = new URLSearchParams({
      query: CONFLICT_QUERY,
      mode: 'artlist',
      maxrecords: '250',
      format: 'json',
      sort: 'datedesc',
      timespan: '48h',
    });

    // Use global GDELT queue to avoid 429s — retry up to 3 times
    let allArticles: GdeltArticle[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await enqueueGdeltRequest(() =>
        fetch(`${GDELT_DOC_API}?${params}`, { signal: controller.signal })
      );
      clearTimeout(timeout);
      if (res.status === 429) {
        console.warn(`[GDELT Conflicts] Rate limited, retry ${attempt + 1}/3`);
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      if (!res.ok) throw new Error(`GDELT ${res.status}`);
      const json = await res.json();
      allArticles = json.articles || [];
      break;
    }

    // Deduplicate and geo-locate with finer 0.05° grid (~5km precision)
    const seen = new Map<string, ConflictEvent>();

    for (const article of allArticles) {
      if (!article.title) continue;
      const geo = extractGeoFromTitle(article.title);
      if (!geo) continue;

      // Fine grid key (0.05° ≈ 5km) — much better than old 0.5° (55km)
      const gridKey = `${Math.round(geo.lat * 20) / 20},${Math.round(geo.lng * 20) / 20}`;
      const existing = seen.get(gridKey);

      if (existing) {
        existing.numArticles++;
        if (article.domain && !existing.sources.includes(article.domain)) {
          existing.sources.push(article.domain);
        }
      } else {
        seen.set(gridKey, {
          id: `gdelt-${gridKey}`,
          title: article.title,
          lat: geo.lat,
          lng: geo.lng,
          locationName: geo.name,
          eventCode: 'conflict',
          goldsteinScale: -5,
          numArticles: 1,
          sources: article.domain ? [article.domain] : [],
          timestamp: article.seendate || new Date().toISOString(),
          url: article.url,
        });
      }
    }

    const events = Array.from(seen.values())
      .sort((a, b) => b.numArticles - a.numArticles)
      .slice(0, 150);

    // All-429 runs yield 0 articles - keep previous data, retry in 15 min
    if (events.length === 0) {
      console.warn('[GDELT Conflicts] 0 events (rate-limited?) - keeping previous data');
      store.lastFetch = Date.now() - CACHE_MS + 15 * 60_000;
      return store.data;
    }

    store.data = events;
    store.lastFetch = Date.now();
    saveDisk(events);

    return events;
  } catch (err) {
    console.error('[GDELT Conflicts] Fetch failed:', err);
    return store.data;
  }
}
