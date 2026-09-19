import fs from 'fs';
import path from 'path';
import { GeoLocation } from './types';
import { LOCATION_MAP } from './config';

/**
 * Plaatsbepaling in drie lagen (14 sep 2026):
 *  1. eigen specifieke sleutels uit LOCATION_MAP (steden, grensposten, samengestelde sleutels zoals "polish border");
 *  2. het GeoNames-register (data/geonames/gazetteer.json, plaatsen ≥ 5.000 inwoners) op hoofdletterwoorden in de tekst,
 *     zodat een bericht over een dorp op de exacte plek landt;
 *  3. pas daarna landniveau ("Ukraine", "Russia") — dat blijft het landmidden, en de kaart ontclustert die met de rozet.
 * De tekst moet in ORIGINELE hoofdletters binnenkomen: de registerlaag matcht alleen woorden met een hoofdletter.
 */

type GazEntry = [number, number, string, number]; // lat, lng, land, inwoners
let GAZ: Record<string, GazEntry> | null = null;
function gazetteer(): Record<string, GazEntry> {
  if (GAZ) return GAZ;
  try {
    GAZ = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'geonames', 'gazetteer.json'), 'utf-8')) as Record<string, GazEntry>;
  } catch (e) {
    console.error('[geo] gazetteer niet geladen', e);
    GAZ = {};
  }
  return GAZ;
}

// Sleutels die een land of regio aanduiden (niet een plek): die verliezen van het register.
const REGION_WORDS = new Set(['usa', 'united states', 'uk', 'united kingdom', 'eu', 'europe', 'middle east', 'baltic states', 'gulf', 'west africa', 'sahel', 'balkans', 'caucasus', 'central asia', 'south china sea', 'red sea', 'black sea', 'baltic sea', 'mediterranean', 'arctic', 'persian gulf', 'gulf of oman', 'horn of africa']);
function isRegionLevel(name: string, coords: { country: string }): boolean {
  return name === (coords.country || '').toLowerCase() || REGION_WORDS.has(name);
}

const sortedLocations = Object.entries(LOCATION_MAP).sort((a, b) => b[0].length - a[0].length);
const CONNECTORS = new Set(['de', 'del', 'da', 'do', 'dos', 'das', 'al', 'el', 'of', 'la', 'le', 'les', 'sur', 'am', 'an', 'der', 'and', 'y', 'e']);
// woorden vóór/na een 1-woords kandidaat die aangeven dat het een plek is en geen persoons- of organisatienaam
const PLACE_CUES = new Set(['in', 'near', 'at', 'from', 'to', 'into', 'outside', 'around', 'across', 'over', 'on', 'toward', 'towards', 'via', 'off', 'of', 'city', 'town', 'village', 'port', 'region', 'province', 'oblast', 'district', 'crossing', 'border', 'airport', 'base', 'station']);

interface Tok { w: string; cap: boolean; start: boolean }

function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  const re = /[\p{L}\p{M}][\p{L}\p{M}'’\-]*/gu;
  let m: RegExpExecArray | null; let last = 0;
  while ((m = re.exec(text)) !== null) {
    const between = text.slice(last, m.index);
    out.push({ w: m[0], cap: /^\p{Lu}/u.test(m[0]), start: out.length === 0 || /[.:;!?()\[\]"“”—–|]|\s-\s/.test(between) });
    last = m.index + m[0].length;
  }
  return out;
}

function gazetteerHit(text: string): GeoLocation | null {
  const gaz = gazetteer();
  const toks = tokenize(text);
  for (let i = 0; i < toks.length; i++) {
    if (!toks[i].cap) continue;
    for (let n = 3; n >= 1; n--) {
      if (i + n > toks.length) continue;
      const span = toks.slice(i, i + n);
      // binnenwoorden mogen verbindingswoorden zijn ("Rio de Janeiro"); eerste en laatste moeten een hoofdletter hebben
      if (!span[n - 1].cap) continue;
      if (span.slice(1, n - 1).some((t) => !t.cap && !CONNECTORS.has(t.w.toLowerCase()))) continue;
      const key = span.map((t) => t.w).join(' ').toLowerCase().replace(/’/g, "'");
      const hit = gaz[key];
      if (!hit) continue;
      if (n === 1) {
        const w = span[0].w;
        if (w.length <= 5 && w === w.toUpperCase()) continue; // afkortingen (NATO, IDF)
        const prev = toks[i - 1], next = toks[i + 1];
        const prevCap = !!prev && prev.cap && !toks[i].start && !PLACE_CUES.has(prev.w.toLowerCase());
        const nextCap = !!next && next.cap && !next.start && !PLACE_CUES.has(next.w.toLowerCase());
        // "Boris Johnson", "Jesse Jackson", "Houston Texans": een hoofdletterbuur maakt het waarschijnlijk een naam, geen plek
        if (prevCap || nextCap) continue;
        // los woord zonder plaats-aanwijzing ervoor of erna ("in Medyka", "Lviv region"): alleen grote plaatsen (≥ 50.000),
        // anders wint elk dorp dat toevallig ook een achternaam of gewoon woord is
        const cued = (!!prev && PLACE_CUES.has(prev.w.toLowerCase())) || (!!next && PLACE_CUES.has(next.w.toLowerCase()));
        if (!cued && hit[3] < 50000) continue;
      }
      return { lat: hit[0], lng: hit[1], name: capitalize(key), country: hit[2] };
    }
  }
  return null;
}

/**
 * Extract geographic location from text. Returns the most specific match:
 * curated specific key → gazetteer place → country/region level.
 */
export function extractLocation(text: string): GeoLocation | null {
  const lowerText = text.toLowerCase();
  let regionHit: GeoLocation | null = null;
  for (const [name, coords] of sortedLocations) {
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (!regex.test(lowerText)) continue;
    const loc = { lat: coords.lat, lng: coords.lng, name: capitalize(name), country: coords.country };
    if (!isRegionLevel(name, coords)) return loc;
    if (!regionHit) regionHit = loc;
  }
  const g = gazetteerHit(text);
  if (g) return g;
  return regionHit;
}

/**
 * Extract all locations from text (curated map only; used for multi-location tagging)
 */
export function extractAllLocations(text: string): GeoLocation[] {
  const lowerText = text.toLowerCase();
  const locations: GeoLocation[] = [];
  const found = new Set<string>();

  for (const [name, coords] of sortedLocations) {
    if (found.has(coords.country + coords.lat)) continue;
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (regex.test(lowerText)) {
      locations.push({
        lat: coords.lat,
        lng: coords.lng,
        name: capitalize(name),
        country: coords.country,
      });
      found.add(coords.country + coords.lat);
    }
  }

  return locations;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
