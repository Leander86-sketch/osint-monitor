import fs from 'fs';
import path from 'path';

// Luchtalarmen Oekraïne per oblast (alerts.com.ua, keyless JSON; bron = officiële sirenes via de
// Oekraïense burgerbescherming). Alleen als kaartlaag, nooit in de rail: dagelijks meerdere alarmen = ruis
// in de feed, maar op de kaart zie je in één oogopslag welk deel van het land nu onder een alarm zit.
// 23 sep 2026.

const SRC_URL = 'https://alerts.com.ua/api/states';
const CACHE_MS = 2 * 60_000;
const DISK_CACHE = path.join(process.cwd(), 'data', 'air-alerts.json');

export interface AirAlertState { id: number; name: string; alert: boolean; changed: string; lat: number; lng: number }
export interface AirAlerts { updated: number; states: AirAlertState[]; active: number }

// Zwaartepunt per oblast (WGS84), grofweg het midden van het gebied; Kyiv (stad) apart.
const CENTROID: Record<string, [number, number]> = {
  'Vinnytsia oblast': [49.0, 28.5], 'Volyn oblast': [51.0, 25.0], 'Dnipropetrovsk oblast': [48.5, 35.0],
  'Donetsk oblast': [48.3, 37.7], 'Zhytomyr oblast': [50.5, 28.5], 'Zakarpattia oblast': [48.5, 23.2],
  'Zaporizhzhia oblast': [47.5, 35.5], 'Ivano-Frankivsk oblast': [48.7, 24.5], 'Kyiv oblast': [50.0, 30.2],
  'Kirovohrad oblast': [48.5, 32.0], 'Luhansk oblast': [48.9, 39.0], 'Lviv oblast': [49.6, 24.0],
  'Mykolaiv oblast': [47.3, 32.0], 'Odesa oblast': [46.8, 30.0], 'Poltava oblast': [49.7, 34.0],
  'Rivne oblast': [51.0, 26.3], 'Sumy oblast': [51.0, 34.3], 'Ternopil oblast': [49.4, 25.6],
  'Kharkiv oblast': [49.7, 36.5], 'Kherson oblast': [46.6, 33.5], 'Khmelnytskyi oblast': [49.4, 26.9],
  'Cherkasy oblast': [49.2, 31.5], 'Chernivtsi oblast': [48.3, 25.9], 'Chernihiv oblast': [51.4, 32.0],
  'Kyiv': [50.45, 30.52],
};

const g = globalThis as unknown as { __airalerts?: { data: AirAlerts | null; lastAttempt: number } };
if (!g.__airalerts) g.__airalerts = { data: null, lastAttempt: 0 };

function loadDisk(): AirAlerts | null { try { return JSON.parse(fs.readFileSync(DISK_CACHE, 'utf8')) as AirAlerts; } catch { return null; } }
function saveDisk(d: AirAlerts): void { try { fs.writeFileSync(DISK_CACHE, JSON.stringify(d)); } catch { /* non-fatal */ } }

interface RawState { id: number; name: string; name_en: string; alert: boolean; changed: string }

async function fetchStates(): Promise<AirAlerts | null> {
  try {
    const res = await fetch(SRC_URL, { headers: { 'user-agent': 'ARGUS/1.0 (argus.prototipo.nl)' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const j = await res.json() as { states?: RawState[] };
    if (!Array.isArray(j.states) || j.states.length < 20) return null;
    const states: AirAlertState[] = [];
    for (const s of j.states) {
      const c = CENTROID[s.name_en]; if (!c) continue;
      states.push({ id: s.id, name: s.name_en, alert: !!s.alert, changed: s.changed, lat: c[0], lng: c[1] });
    }
    return { updated: Date.now(), states, active: states.filter(s => s.alert).length };
  } catch {
    return null;
  }
}

export async function getAirAlerts(): Promise<AirAlerts | null> {
  const st = g.__airalerts!;
  if (!st.data) st.data = loadDisk();
  if (st.data && Date.now() - st.data.updated < CACHE_MS) return st.data;
  if (Date.now() - st.lastAttempt > 30_000) {
    st.lastAttempt = Date.now();
    const d = await fetchStates();
    if (d) { st.data = d; saveDisk(d); }
  }
  return st.data;
}
