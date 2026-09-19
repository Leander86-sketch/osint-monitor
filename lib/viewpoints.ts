// Windstreken van bronnen (19 sep 2026): waar kijkt een bron vandaan? Gebruikt door de breaking-rail en het dossier
// om dezelfde gebeurtenis naast elkaar te zetten. Indeling op bronnaam, met de feedcategorie als terugval.
// "state" = staatspersbureau of staatsomroep; dat staat erbij omdat TASS en de Moscow Times niet hetzelfde zijn.
import { NewsItem } from '@/lib/types';

export type View = 'WEST' | 'RUSSIA' | 'UKRAINE' | 'MIDEAST' | 'ASIA' | 'OTHER';
export const VIEWS: View[] = ['WEST', 'RUSSIA', 'UKRAINE', 'MIDEAST', 'ASIA', 'OTHER'];
export const VIEW_COLOR: Record<View, string> = { WEST: '#60a5fa', RUSSIA: '#f87171', UKRAINE: '#facc15', MIDEAST: '#34d399', ASIA: '#c084fc', OTHER: '#9ca3af' };
export const VIEW_LABEL: Record<View, string> = { WEST: 'Western', RUSSIA: 'Russian', UKRAINE: 'Ukrainian', MIDEAST: 'Middle East', ASIA: 'Asian', OTHER: 'Other' };

const BY_SOURCE: Array<[RegExp, View]> = [
  [/tass|ria\b|rt\b|sputnik|moscow times|meduza|interfax|novaya/i, 'RUSSIA'],
  [/ukrinform|kyiv|ukrainska|pravda|united24/i, 'UKRAINE'],
  [/al jazeera|middle east eye|arab news|al-monitor|times of israel|haaretz|jerusalem|rudaw|al arabiya|i24|anadolu|trt|press tv|irna|tehran/i, 'MIDEAST'],
  [/scmp|south china|cna\b|channel news|nhk|nikkei|hindu|india|wion|xinhua|global times|cgtn|yonhap|korea|japan times|straits|abc australia/i, 'ASIA'],
];
const STATE_RE = /\b(tass|ria|sputnik|rt|xinhua|global times|cgtn|press tv|irna|anadolu|trt|kcna|ukrinform)\b/i;

export function viewOf(i: Pick<NewsItem, 'source' | 'category'>): View {
  for (const [re, v] of BY_SOURCE) if (re.test(i.source)) return v;
  if (i.category === 'mideast') return 'MIDEAST';
  if (i.category === 'asia') return 'ASIA';
  if (['europe', 'americas', 'world', 'defense', 'gov', 'thinktank', 'crisis', 'nuclear', 'cyber', 'energy'].includes(i.category || '')) return 'WEST';
  return 'OTHER';
}
export const isStateMedia = (source: string) => STATE_RE.test(source);

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'after', 'over', 'into', 'says', 'said', 'amid', 'will', 'have', 'has', 'are', 'was', 'were', 'its', 'his', 'her', 'their', 'new', 'more', 'than', 'about', 'against', 'news', 'live', 'update', 'updates', 'report', 'reports']);
export const titleWords = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9à-ÿ ]+/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));

export interface EventCluster { lead: NewsItem; items: NewsItem[]; w: Set<string> }
// Berichten over dezelfde gebeurtenis samennemen: ≥4 gedeelde kernwoorden, of ≥3 bij 60% overlap, binnen 8 uur. Invoer: nieuwste eerst.
export function clusterEvents(items: NewsItem[], windowH = 8): EventCluster[] {
  const out: EventCluster[] = [];
  for (const it of items) {
    const w = titleWords(it.title); let home: EventCluster | null = null;
    for (const c of out) {
      if (Math.abs(new Date(c.lead.pubDate).getTime() - new Date(it.pubDate).getTime()) > windowH * 3600000) continue;
      let shared = 0; w.forEach(x => { if (c.w.has(x)) shared++; });
      if (shared >= 4 || (shared >= 3 && shared / Math.min(w.size, c.w.size) >= 0.6)) { home = c; break; }
    }
    if (home) { home.items.push(it); w.forEach(x => home!.w.add(x)); } else out.push({ lead: it, items: [it], w });
  }
  return out;
}
export const agoShort = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${Math.floor(m / 1440)}d`; };
