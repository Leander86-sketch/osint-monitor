import { Situation, AnchorSituation, NewsItem } from './types';
import { SITUATIONS } from './config';
import { determineSeverity } from './utils';
import { getNewsItems, getLastFetchTime } from './store';

const SEV_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const SEV_NAME = ['low', 'medium', 'high', 'critical'] as const;
const STATUS_RANK: Record<string, number> = { breaking: 0, active: 1, cooling: 2 };
// Genuine conflict-event terms - title signal for auto-emerge gating + on-topic headline picking.
const STRONG_RE = /\b(airstrike|air strike|missile|rocket|shelling|bombing|bomb|explosion|killed|dead|casualt|wounded|attack|assault|offensive|clash|fighting|gunmen|gunman|militant|insurgent|troops|siege|ambush|raid|fighters|war|hostage|coup|massacre|drone|sanction|blockade)\b/i;
// Off-topic items (sport teams named after places, entertainment) that must not pollute situations.
const NOISE_RE = /\b(world cup|world championship|champions league|premier league|grand prix|formula 1|olympic|olympics|football|soccer|cricket|rugby|tennis|nba|nfl|golf|box office|grammy|oscar|eurovision|celebrity|red carpet)\b/i;

interface Cache { key: number; ts: number; value: Situation[] }
const g = globalThis as unknown as { __situationsCache?: Cache };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Items sharing one second with 3+ others have batch-assigned fake dates; exclude from velocity.
function realDateSet(items: NewsItem[]): Set<string> {
  const bySec = new Map<number, NewsItem[]>();
  for (const it of items) {
    const sec = Math.floor(new Date(it.pubDate).getTime() / 1000);
    const arr = bySec.get(sec) || [];
    arr.push(it);
    bySec.set(sec, arr);
  }
  const real = new Set<string>();
  for (const arr of bySec.values()) {
    if (arr.length <= 3) for (const it of arr) real.add(it.id);
  }
  return real;
}

interface SitBase {
  id: string; slug: string; title: string; type: string; curated: boolean;
  center: { lat: number; lng: number }; bbox: [number, number, number, number]; zoom: number; actors: string[];
}

function buildSituation(base: SitBase, items: NewsItem[], now: number, prefer: (it: NewsItem) => boolean = () => false): Situation {
  const sorted = [...items].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  const real = realDateSet(sorted);
  const within = (ms: number) => sorted.filter(i => { if (!real.has(i.id)) return false; const age = now - new Date(i.pubDate).getTime(); return age >= 0 && age <= ms; }).length;
  const velocity1h = within(3600000);
  const velocity24h = within(86400000);

  let sevIdx = 0;
  const tier = { t1: 0, t2: 0, t3: 0 };
  const kwCount = new Map<string, number>();
  const sources = new Set<string>();
  const spark = new Array(24).fill(0);
  for (const it of sorted) {
    sevIdx = Math.max(sevIdx, SEV_ORDER[determineSeverity(it.title + ' ' + it.description)] ?? 0);
    const t = it.sourceTier || 3;
    if (t === 1) tier.t1++; else if (t === 2) tier.t2++; else tier.t3++;
    sources.add(it.source);
    for (const k of it.keywords) kwCount.set(k, (kwCount.get(k) || 0) + 1);
    if (real.has(it.id)) {
      const age = now - new Date(it.pubDate).getTime();
      if (age >= 0 && age <= 86400000) {
        const bucket = 23 - Math.floor(age / 3600000);
        if (bucket >= 0 && bucket < 24) spark[bucket]++;
      }
    }
  }
  const distinct = sources.size;
  const corroboration: 'A' | 'B' | 'C' = (tier.t1 >= 2 || distinct >= 5) ? 'A' : (tier.t1 >= 1 || distinct >= 3) ? 'B' : 'C';
  const status: Situation['status'] = velocity1h >= 4 ? 'breaking' : velocity24h >= 1 ? 'active' : 'cooling';
  const topKeywords = [...kwCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
  const latest = sorted.find(prefer) || sorted[0];

  return {
    id: base.id, slug: base.slug, title: base.title, type: base.type, curated: base.curated,
    center: base.center, bbox: base.bbox, zoom: base.zoom,
    severity: SEV_NAME[sevIdx],
    status,
    itemIds: sorted.map(i => i.id),
    actors: base.actors,
    keywords: topKeywords,
    latestHeadline: latest ? latest.title : '',
    latestLink: latest ? latest.link : '',
    latestPubDate: latest ? latest.pubDate : '',
    metadata: {
      articleCount: sorted.length,
      velocity1h, velocity24h,
      sourceTierCounts: tier,
      corroboration,
      sparkline: spark,
      lastUpdated: latest ? latest.pubDate : new Date(now).toISOString(),
    },
  };
}

function matchesAnchor(it: NewsItem, a: AnchorSituation): boolean {
  if (a.requireStrong && !STRONG_RE.test(it.title)) return false;
  const t = ' ' + it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  return a.anchorKeywords.some(k => t.includes(' ' + k.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' '));
}

export function computeSituations(): Situation[] {
  const lastFetch = getLastFetchTime();
  const now = Date.now();
  if (g.__situationsCache && g.__situationsCache.key === lastFetch && (now - g.__situationsCache.ts) < 30000) {
    return g.__situationsCache.value;
  }

  const items = getNewsItems(2000, 0).filter(i => i.category !== 'sport' && i.keywords.length > 0 && !NOISE_RE.test(i.title));

  // 1) curated anchors - first match wins
  const buckets = new Map<string, NewsItem[]>();
  const claimed = new Set<string>();
  for (const it of items) {
    for (const a of SITUATIONS) {
      if (matchesAnchor(it, a)) {
        const arr = buckets.get(a.id) || [];
        arr.push(it);
        buckets.set(a.id, arr);
        claimed.add(it.id);
        break;
      }
    }
  }
  const out: Situation[] = [];
  for (const a of SITUATIONS) {
    const its = buckets.get(a.id);
    if (!its || its.length === 0) continue;
    out.push(buildSituation({ ...a, curated: true }, its, now, (it) => matchesAnchor(it, a)));
  }

  // 2) auto-emerging - geo-located, unclaimed items grouped by location name (24h, with corroboration gate)
  const AUTO_EXCLUDE = new Set(['pentagon','washington','new york','london','paris','berlin','brussels','geneva','usa','united states','russia','china']);
  const autoBuckets = new Map<string, NewsItem[]>();
  for (const it of items) {
    if (claimed.has(it.id)) continue;
    if (!it.location || !it.location.name) continue;
    if (AUTO_EXCLUDE.has(it.location.name.toLowerCase())) continue;
    if ((now - new Date(it.pubDate).getTime()) > 86400000) continue;
    if (!STRONG_RE.test(it.title)) continue;
    const lat = it.location.lat, lng = it.location.lng;
    if (SITUATIONS.some(a => lat >= a.bbox[0] && lat <= a.bbox[2] && lng >= a.bbox[1] && lng <= a.bbox[3])) continue; // region already covered by an anchor
    const key = it.location.name.toLowerCase();
    const arr = autoBuckets.get(key) || [];
    arr.push(it);
    autoBuckets.set(key, arr);
  }
  for (const its of autoBuckets.values()) {
    const sources = new Set(its.map(i => i.source));
    const tiers = new Set(its.map(i => i.sourceTier || 3));
    if (its.length < 3 || sources.size < 3 || tiers.size < 2) continue; // hysteresis-lite (buckets are already conflict-event titles)
    const loc = its[0].location!;
    const kwCount = new Map<string, number>();
    for (const it of its) for (const k of it.keywords) kwCount.set(k, (kwCount.get(k) || 0) + 1);
    const topKw = [...kwCount.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]).find(k => k.toLowerCase() !== loc.name.toLowerCase());
    const title = topKw ? loc.name + ' - ' + topKw : loc.name;
    const id = 'auto-' + slugify(loc.name);
    if (out.some(s => s.id === id)) continue;
    const d = 3;
    const bbox: [number, number, number, number] = [loc.lat - d, loc.lng - d, loc.lat + d, loc.lng + d];
    out.push(buildSituation({ id, slug: slugify(loc.name), title, type: 'conflict', curated: false, center: { lat: loc.lat, lng: loc.lng }, bbox, zoom: 6, actors: [] }, its, now, (it) => STRONG_RE.test(it.title)));
  }

  out.sort((a, b) =>
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    b.metadata.velocity1h - a.metadata.velocity1h ||
    SEV_ORDER[b.severity] - SEV_ORDER[a.severity] ||
    b.metadata.articleCount - a.metadata.articleCount
  );

  g.__situationsCache = { key: lastFetch, ts: now, value: out };
  return out;
}

export function getSituationBySlug(slug: string): Situation | undefined {
  return computeSituations().find(s => s.slug === slug);
}
