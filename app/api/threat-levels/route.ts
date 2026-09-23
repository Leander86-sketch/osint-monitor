import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Officiële terreurdreigingsniveaus (23 sep 2026). Alleen bronnen waarvan het niveau als tekst op de officiële pagina staat:
//   NL  NCTV Dreigingsbeeld (schaal 1–5)         nctv.nl/onderwerpen/dtn
//   UK  GOV.UK national threat level (5 niveaus)  gov.uk/terrorism-national-emergency  (OGL v3)
//   US  DHS NTAS bulletins (public domain)        dhs.gov/ntas/1.1/feed.xml
// België (CUTA) toont het niveau niet als tekst, Frankrijk/Zweden/Denemarken blokkeren of hebben geen pagina → niet opgenomen:
// liever drie juiste niveaus dan vier waarvan één geraden. Elke 6 uur ververst; de laatste goede stand blijft staan bij een storing.
export const dynamic = 'force-dynamic';

export interface ThreatLevel { code: string; country: string; level: string; scale: string; label: string; source: string; url: string; fetchedAt: string; ok: boolean }
interface Snap { updatedAt: string; levels: ThreatLevel[] }

const FILE = join(process.cwd(), 'data', 'threat-levels.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ARGUS-dashboard/1.0', 'Accept-Language': 'en,nl' };
const SIX_H = 6 * 3600 * 1000;
let mem: Snap | null = null;

function text(html: string): string { return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '); }
async function get(url: string): Promise<string> { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000), cache: 'no-store' }); if (!r.ok) throw new Error(`${r.status}`); return r.text(); }

const NL_LABEL: Record<string, string> = { '1': 'minimal', '2': 'limited', '3': 'possible', '4': 'substantial', '5': 'critical' };
async function nl(): Promise<Partial<ThreatLevel>> {
  const t = text(await get('https://www.nctv.nl/onderwerpen/dtn'));
  const m = t.match(/(?:gehandhaafd op|vastgesteld op|blijft op|staat op|bedraagt|is)\s+(?:dreigings)?niveau\s*([1-5])/i) || t.match(/niveau\s*([1-5])\s*(?:van|\/)\s*5/i);
  if (!m) throw new Error('niveau niet gevonden');
  return { level: m[1], scale: '/5', label: NL_LABEL[m[1]] || '' };
}
async function uk(): Promise<Partial<ThreatLevel>> {
  const t = text(await get('https://www.gov.uk/terrorism-national-emergency'));
  const m = t.match(/threat to the UK[^.]{0,120}?from terrorism is\s+(low|moderate|substantial|severe|critical)/i);
  if (!m) throw new Error('niveau niet gevonden');
  const lvl = m[1].toLowerCase(); const rank: Record<string, string> = { low: '1', moderate: '2', substantial: '3', severe: '4', critical: '5' };
  return { level: rank[lvl], scale: '/5', label: lvl };
}
async function us(): Promise<Partial<ThreatLevel>> {
  const x = await get('https://www.dhs.gov/ntas/1.1/feed.xml');
  const n = (x.match(/<alert\b/gi) || []).length;
  if (!n) return { level: '0', scale: '', label: 'no active NTAS bulletin' };
  const kind = /alertType="?(Elevated|Imminent)/i.exec(x)?.[1] || 'Bulletin';
  return { level: kind === 'Imminent' ? '2' : '1', scale: '/2', label: `${n} active ${kind.toLowerCase()}${n > 1 ? 's' : ''}` };
}

const SOURCES: Array<{ code: string; country: string; source: string; url: string; fn: () => Promise<Partial<ThreatLevel>> }> = [
  { code: 'NL', country: 'Netherlands', source: 'NCTV', url: 'https://www.nctv.nl/onderwerpen/dtn', fn: nl },
  { code: 'UK', country: 'United Kingdom', source: 'GOV.UK / JTAC', url: 'https://www.gov.uk/terrorism-national-emergency', fn: uk },
  { code: 'US', country: 'United States', source: 'DHS NTAS', url: 'https://www.dhs.gov/ntas', fn: us },
];

async function refresh(prev: Snap | null): Promise<Snap> {
  const now = new Date().toISOString();
  const levels = await Promise.all(SOURCES.map(async s => {
    const old = prev?.levels.find(l => l.code === s.code);
    try { const r = await s.fn(); return { code: s.code, country: s.country, source: s.source, url: s.url, level: r.level || '', scale: r.scale || '', label: r.label || '', fetchedAt: now, ok: true }; }
    catch { return old ? { ...old, ok: false } : { code: s.code, country: s.country, source: s.source, url: s.url, level: '', scale: '', label: 'unavailable', fetchedAt: now, ok: false }; }
  }));
  const snap = { updatedAt: now, levels };
  try { mkdirSync(join(process.cwd(), 'data'), { recursive: true }); writeFileSync(FILE, JSON.stringify(snap)); } catch { /* alleen geheugen */ }
  return snap;
}

export async function GET() {
  if (!mem) { try { mem = JSON.parse(readFileSync(FILE, 'utf-8')) as Snap; } catch { mem = null; } }
  if (!mem || Date.now() - new Date(mem.updatedAt).getTime() > SIX_H) mem = await refresh(mem);
  return NextResponse.json(mem, { headers: { 'Cache-Control': 'public, max-age=1800' } });
}
