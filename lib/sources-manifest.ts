// Single source of truth for the "What am I looking at?" panel.
// Feed stats are derived live from config so they never drift; the layer
// list is explicit (layers change rarely) and mirrors the map's LAYER_CONFIG.
import { RSS_FEEDS } from './config';

export interface LayerInfo { label: string; shows: string; source: string; cadence: string }

export const MAP_LAYERS: LayerInfo[] = [
  { label: 'FLIGHT', shows: 'Live aircraft, military highlighted', source: 'OpenSky + adsb.lol (transponders)', cadence: '~1 min' },
  { label: 'AIS', shows: 'Ships at strategic chokepoints', source: 'AISStream (terrestrial AIS)', cadence: 'live' },
  { label: 'SATELLITE', shows: 'Satellites overhead', source: 'CelesTrak (TLE orbital elements)', cadence: 'daily elements' },
  { label: 'CONFLICT', shows: 'Conflict events from news', source: 'GDELT (news mentions)', cadence: '~15 min' },
  { label: 'CVN', shows: 'US carrier strike groups', source: 'USNI Fleet Tracker', cadence: 'weekly' },
  { label: 'FRONT', shows: 'Assessed frontline, Ukraine', source: 'DeepStateMap', cadence: 'daily' },
  { label: 'TONE', shows: 'News sentiment by region', source: 'GDELT tone', cadence: '~15 min' },
  { label: 'NET', shows: 'Internet outages & anomalies', source: 'Cloudflare Radar', cadence: '~30 min' },
  { label: 'THERMAL', shows: 'Fires, strikes, explosions (heat)', source: 'NASA FIRMS (VIIRS)', cadence: '~3 hours' },
  { label: 'HAZARD', shows: 'Earthquakes & disasters', source: 'USGS + GDACS + EMSC', cadence: 'real-time' },
  { label: 'DISP', shows: 'Refugees & displacement', source: 'UNHCR', cadence: 'yearly stats' },
  { label: 'CHOKE', shows: 'Maritime chokepoints', source: 'Curated (Hormuz, Suez, ...)', cadence: 'static' },
  { label: 'CAM', shows: 'Public live cameras', source: 'Open camera networks', cadence: 'live' },
];

export const INTEL_PANELS: { label: string; source: string }[] = [
  { label: 'Intel Feed', source: '118 tiered news feeds' },
  { label: 'BSKY', source: '16 curated OSINT accounts (Bluesky firehose)' },
  { label: 'Telegram', source: 'Public OSINT channels' },
  { label: 'Aid', source: 'UN OCHA / ReliefWeb humanitarian reports' },
  { label: 'Sanctions', source: 'EU Sanctions Map' },
  { label: 'Arms', source: 'SIPRI arms transfers' },
];

export function feedStats() {
  const enabled = RSS_FEEDS.filter(f => f.enabled);
  const byRegion: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  for (const f of enabled) {
    byRegion[f.region || 'other'] = (byRegion[f.region || 'other'] || 0) + 1;
    byTier[`tier${f.tier || 3}`] = (byTier[`tier${f.tier || 3}`] || 0) + 1;
  }
  return { total: enabled.length, byRegion, byTier };
}
