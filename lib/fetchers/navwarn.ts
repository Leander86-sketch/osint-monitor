// Navigatiewaarschuwingen op zee (23 sep 2026): NGA Maritime Safety Information, broadcast warnings "in force"
// (NAVAREA IV/XII + HYDROLANT/HYDROPAC; US public domain). Alleen wat voor een conflictdashboard telt: mijnen,
// raket-/schietoefeningen, GPS-storing, onderzeeboot-/militaire operaties, kabel- en pijpleidingwerk, gevaarlijke operaties.
// Lichtboeien, kaartcorrecties, surveys en radioberichten (het merendeel) worden weggelaten. Elke 3 uur; laatste goede stand blijft.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface NavWarn { id: string; kind: 'mine' | 'exercise' | 'gps' | 'ops' | 'cable' | 'hazard'; area: string; title: string; text: string; lat: number; lng: number; points: number; issued: string; year: number }
interface Snap { updatedAt: string; warnings: NavWarn[]; total: number }

const URL = 'https://msi.nga.mil/api/publications/broadcast-warn?status=active&output=json';
const FILE = join(process.cwd(), 'data', 'navwarn.json');
const TTL = 3 * 3600 * 1000;
let mem: Snap | null = null;

const CO = /(\d{1,2})-(\d{2}(?:\.\d+)?)(?:-(\d{2}))?([NS])\s+(\d{1,3})-(\d{2}(?:\.\d+)?)(?:-(\d{2}))?([EW])/g;
function coords(t: string): Array<[number, number]> {
  const out: Array<[number, number]> = []; let m: RegExpExecArray | null; CO.lastIndex = 0;
  while ((m = CO.exec(t))) {
    let lat = Number(m[1]) + Number(m[2]) / 60 + (m[3] ? Number(m[3]) / 3600 : 0); let lon = Number(m[5]) + Number(m[6]) / 60 + (m[7] ? Number(m[7]) / 3600 : 0);
    if (m[4] === 'S') lat = -lat; if (m[8] === 'W') lon = -lon;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) out.push([lat, lon]);
  }
  return out;
}
const KINDS: Array<[NavWarn['kind'], RegExp]> = [
  ['mine', /\bMINES?\b|MINE DANGER|MINEFIELD|MINE CLEARANCE/],
  ['gps', /\bGPS\b|\bGNSS\b|INTERFERENCE|JAMMING|SPOOFING/],
  ['exercise', /MISSILE|ROCKET|GUNNERY|LIVE FIRE|FIRING (EXERCISE|PRACTICE)|NAVAL EXERCISE|SPACE DEBRIS|LAUNCH/],
  ['ops', /SUBMARINE|MILITARY OPERATIONS|WARSHIP|UNMANNED|\bUAV\b|\bDRONE/],
  ['cable', /CABLE (OPERATIONS|LAYING|REPAIR|WORK)|PIPELINE|SUBSEA|UNDERWATER OPERATIONS/],
  ['hazard', /HAZARDOUS OPERATIONS|DERELICT|ADRIFT|DRIFTING|CAPSIZ|DANGER TO NAVIGATION/],
];
const AREA: Record<string, string> = { '4': 'NAVAREA IV (W Atlantic)', '12': 'NAVAREA XII (E Pacific)', 'A': 'HYDROLANT (Atlantic/Med/Black Sea)', 'P': 'HYDROPAC (Pacific/Indian Ocean)', 'C': 'HYDROARC (Arctic)' };

function parse(rows: Array<Record<string, string>>): NavWarn[] {
  const out: NavWarn[] = [];
  for (const r of rows) {
    const text = String(r.text || ''); const up = text.toUpperCase();
    if (/WARNINGS IN FORCE|CANCEL THIS MSG|NAVTEX|CHART CORRECTION|LIGHT (LIST|UNLIT|EXTINGUISHED)|BUOY/.test(up) && !/MINE|MISSILE|GPS|SUBMARINE/.test(up)) continue;
    const kind = KINDS.find(([, re]) => re.test(up))?.[0]; if (!kind) continue;
    const cs = coords(text); if (!cs.length) continue;
    const lat = cs.reduce((a, c) => a + c[0], 0) / cs.length, lng = cs.reduce((a, c) => a + c[1], 0) / cs.length;
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const title = lines.slice(0, 2).join(' ').replace(/\.$/, '').slice(0, 90);
    out.push({ id: `${r.navArea}-${r.msgYear}-${r.msgNumber}`, kind, area: AREA[String(r.navArea)] || String(r.navArea), title, text: text.slice(0, 700), lat, lng, points: cs.length, issued: String(r.issueDate || ''), year: Number(r.msgYear) || 0 });
  }
  return out;
}

export async function fetchNavWarnings(): Promise<Snap> {
  if (!mem) { try { mem = JSON.parse(readFileSync(FILE, 'utf-8')) as Snap; } catch { mem = null; } }
  if (mem && Date.now() - new Date(mem.updatedAt).getTime() < TTL) return mem;
  try {
    const r = await fetch(URL, { headers: { 'User-Agent': 'ARGUS-dashboard/1.0 (+https://argus.prototipo.nl)' }, signal: AbortSignal.timeout(30000), cache: 'no-store' });
    if (!r.ok) throw new Error(`NGA ${r.status}`);
    const j = (await r.json()) as { 'broadcast-warn'?: Array<Record<string, string>> };
    const rows = j['broadcast-warn'] || [];
    mem = { updatedAt: new Date().toISOString(), warnings: parse(rows), total: rows.length };
    try { mkdirSync(join(process.cwd(), 'data'), { recursive: true }); writeFileSync(FILE, JSON.stringify(mem)); } catch { /* alleen geheugen */ }
  } catch { if (!mem) mem = { updatedAt: new Date(0).toISOString(), warnings: [], total: 0 }; }
  return mem;
}
