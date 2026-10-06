// Handgemaakte dossiers per situatie (6 okt 2026). Eén JSON per slug in data/dossiers/: de stand in gewone zinnen,
// tellers met per cijfer een bron, plaatsen uit de berichten, wat vaststaat / wat niet, tijdlijn en bronnentabel.
// Geen LLM in de pipeline: de inhoud wordt met de hand samengesteld uit de bronnen die ARGUS zelf leest.
import fs from 'fs';
import path from 'path';

export interface DossierSource { name: string; url: string; date?: string }
export interface DossierCounter { label: string; value: string; color?: string; note: string; sources: DossierSource[] }
import type { PlaceKind } from '@/lib/dossier-kinds';
export interface DossierPlace { name: string; where: string; role: string; lat: number; lon: number; kind: PlaceKind }
export interface DossierClaim { text: string; src: string }
export interface DossierEvent { date: string; status?: 'unconfirmed'; text: string; sources: DossierSource[] }
export interface Dossier {
  slug: string;
  subtitle?: string;
  updatedAt: string;
  stand: string;
  counters: DossierCounter[];
  map?: { center: [number, number]; zoom: number };
  places: DossierPlace[];
  known: DossierClaim[];
  unconfirmed: DossierClaim[];
  timeline: DossierEvent[];
  context?: { title: string; note?: string; bullets: string[]; source?: DossierSource };
  sources: { who: string; what: string; url: string; date: string }[];
  disclaimer?: string;
}

const DIR = path.join(process.cwd(), 'data', 'dossiers');

export function getDossier(slug: string): Dossier | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const p = path.join(DIR, `${slug}.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as Dossier; } catch { return null; }
}

export function listDossierSlugs(): string[] {
  try { return fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')); } catch { return []; }
}
