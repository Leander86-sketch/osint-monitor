// Redactionele laag van een situatiedossier (6 okt 2026). Eén JSON per slug in data/dossiers/.
// De automatische laag (pols, windstreken, plaatsen uit de koppen, kopkolommen) komt uit de feeds en staat op ELKE
// situatiepagina; dit bestand voegt alleen toe wat een feed niet kan: de stand in zinnen, een claim-grootboek met
// status per bewering, de tijdlijn met wie-zegt-wat, en de plaatsen op gebouwniveau. Met de hand samengesteld uit
// de bronnen die ARGUS zelf leest; elke regel linkt naar zijn bron.
import fs from 'fs';
import path from 'path';
import type { PlaceKind } from '@/lib/dossier-kinds';

export interface DossierSource { name: string; url: string; date?: string }
export interface DossierFigure { label: string; value: string; color?: string; src: DossierSource }
export type ClaimStatus = 'confirmed' | 'reported' | 'disputed' | 'debunked';
export interface DossierClaim { status: ClaimStatus; text: string; by: string; sources: DossierSource[] }
export interface DossierPlace { name: string; where: string; role: string; lat: number; lon: number; kind: PlaceKind }
export type EventKind = 'official' | 'media' | 'denial' | 'factcheck' | 'reaction';
export interface DossierEvent { date: string; kind: EventKind; text: string; sources: DossierSource[] }
export interface Dossier {
  slug: string;
  updatedAt: string;
  stand: string;
  figures: DossierFigure[];
  claims: DossierClaim[];
  map?: { center: [number, number]; zoom: number };
  places: DossierPlace[];
  timeline: DossierEvent[];
  background?: { title: string; note?: string; bullets: string[]; source?: DossierSource };
  sources: { who: string; what: string; url: string; date: string }[];
  disclaimer?: string;
}

const DIR = path.join(process.cwd(), 'data', 'dossiers');

export function getDossier(slug: string): Dossier | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), 'utf8')) as Dossier; } catch { return null; }
}

export function listDossierSlugs(): string[] {
  try { return fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')); } catch { return []; }
}
