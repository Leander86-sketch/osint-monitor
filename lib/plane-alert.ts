// Opvallende vliegtuigen (22 sep 2026): de open lijst plane-alert-db (sdr-enthusiasts, ODbL 1.0) gelegd op de
// militaire vluchten van adsb.lol. Een treffer krijgt een korte badge: "Doomsday plane", "SIGINT", "Dictator Alert"…
// De lijst wordt één keer per dag opgehaald en in data/ bewaard; zonder netwerk blijft de laatste kopie gelden.
import { readFileSync, writeFileSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';

const URL = 'https://raw.githubusercontent.com/sdr-enthusiasts/plane-alert-db/main/plane-alert-db.csv';
const FILE = join(process.cwd(), 'data', 'plane-alert-db.csv');
const DAY = 86_400_000;

export interface Notable { badge: string; category: string; operator: string; type: string; link?: string }

// Alleen categorieën/tags die voor een conflictdashboard iets zeggen; politie, brandweer en 'Toy Soldiers' (trainers) niet.
const CATS = new Set(['Oxcart', 'Distinctive', 'Dictator Alert', 'Governments', 'Ptolemy would be proud', 'UAV', 'Gunship', 'Hired Gun']);
const BADGE: Array<[RegExp, string]> = [
  [/doomsday/i, 'Doomsday plane'], [/looking glass|tacamo/i, 'Nuclear C2'], [/dictator alert/i, 'Dictator Alert'],
  [/sigint|elint|eye in the sky|reconnaissance|surveillance|covert/i, 'SIGINT / recon'], [/airborne early warning|hawkeye|awacs/i, 'AEW'],
  [/one ping only|anti submarine/i, 'ASW patrol'], [/uav|drone/i, 'UAV'], [/gunship/i, 'Gunship'], [/aerial survey|measuring stick/i, 'Survey'],
];

let db: Map<string, Notable> | null = null; let loadedAt = 0;

function parseCsv(text: string): Map<string, Notable> {
  const out = new Map<string, Notable>(); const lines = text.split('\n'); const head = lines[0].split(',');
  const col = (n: string) => head.indexOf(n);
  const iIcao = col('$ICAO'), iOp = col('$Operator'), iType = col('$Type'), iT1 = col('$Tag 1'), iT2 = col('$#Tag 2'), iT3 = col('$#Tag 3'), iCat = col('Category'), iLink = col('$#Link');
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(','); if (f.length < head.length) continue;
    const cat = f[iCat]; if (!CATS.has(cat)) continue;
    const tags = `${f[iT1]} ${f[iT2]} ${f[iT3]} ${cat}`;
    let badge = ''; for (const [re, b] of BADGE) if (re.test(tags)) { badge = b; break; }
    if (!badge && cat === 'Governments') badge = 'Government'; if (!badge && cat === 'Hired Gun') badge = 'Contractor ISR';
    if (!badge) continue;
    out.set(f[iIcao].toLowerCase(), { badge, category: cat, operator: f[iOp], type: f[iType], link: f[iLink] || undefined });
  }
  return out;
}

async function load(): Promise<Map<string, Notable>> {
  if (db && Date.now() - loadedAt < DAY) return db;
  try {
    let text: string | null = null;
    try { if (Date.now() - statSync(FILE).mtimeMs < DAY) text = readFileSync(FILE, 'utf-8'); } catch { /* geen kopie */ }
    if (!text) {
      const r = await fetch(URL, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`plane-alert-db ${r.status}`);
      text = await r.text(); mkdirSync(join(process.cwd(), 'data'), { recursive: true }); writeFileSync(FILE, text);
    }
    db = parseCsv(text); loadedAt = Date.now();
  } catch { if (!db) { try { db = parseCsv(readFileSync(FILE, 'utf-8')); } catch { db = new Map(); } } loadedAt = Date.now(); }
  return db;
}

export async function notableFor(icao: string): Promise<Notable | undefined> { return (await load()).get(icao.toLowerCase()); }
export async function notableDbSize(): Promise<number> { return (await load()).size; }
