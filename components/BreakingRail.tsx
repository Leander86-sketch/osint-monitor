'use client';

// Breaking-rail (19 sep 2026, /next): de lopende feed boven de vouw, altijd aan.
// Alleen conflictnieuws, nieuwste boven. Berichten over dezelfde gebeurtenis worden samengenomen: je ziet één regel met
// hoeveel verschillende bronnen het dragen en wie het eerst had; openklappen toont dezelfde gebeurtenis per bron, met de
// windstreek van die bron erbij (West, Rusland, Oekraïne, Midden-Oosten, Azië). Dat is de pluriformiteit, zichtbaar gemaakt.
import { useEffect, useMemo, useState } from 'react';
import { NewsItem, Situation } from '@/lib/types';
import { isMarketItem, CONFLICT_RE } from '@/components/LiveFeed';

type View = 'WEST' | 'RUSSIA' | 'UKRAINE' | 'MIDEAST' | 'ASIA' | 'OTHER';
const VIEW_COLOR: Record<View, string> = { WEST: '#60a5fa', RUSSIA: '#f87171', UKRAINE: '#facc15', MIDEAST: '#34d399', ASIA: '#c084fc', OTHER: '#9ca3af' };
const BY_SOURCE: Array<[RegExp, View]> = [
  [/tass|ria|rt\b|sputnik|moscow times|meduza|interfax/i, 'RUSSIA'],
  [/ukrinform|kyiv|ukrainska|pravda|united24/i, 'UKRAINE'],
  [/al jazeera|middle east eye|arab news|al-monitor|times of israel|haaretz|jerusalem|rudaw|al arabiya|i24|anadolu|trt|iran|press tv/i, 'MIDEAST'],
  [/scmp|south china|cna|channel news|nhk|nikkei|hindu|india|wion|xinhua|global times|yonhap|korea|japan times|straits|abc australia/i, 'ASIA'],
];
function viewOf(i: NewsItem): View {
  for (const [re, v] of BY_SOURCE) if (re.test(i.source)) return v;
  if (i.category === 'mideast') return 'MIDEAST'; if (i.category === 'asia') return 'ASIA';
  if (['europe', 'americas', 'world', 'defense', 'gov', 'thinktank', 'crisis'].includes(i.category || '')) return 'WEST';
  return 'OTHER';
}

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'after', 'over', 'into', 'says', 'said', 'amid', 'will', 'have', 'has', 'are', 'was', 'were', 'its', 'his', 'her', 'their', 'new', 'more', 'than', 'about', 'against', 'news', 'live', 'update', 'updates', 'report', 'reports']);
const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9à-ÿ ]+/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
interface Cluster { lead: NewsItem; items: NewsItem[]; w: Set<string> }

function cluster(items: NewsItem[]): Cluster[] {
  const out: Cluster[] = [];
  for (const it of items) { // nieuwste eerst
    const w = words(it.title); let home: Cluster | null = null;
    for (const c of out) {
      if (Math.abs(new Date(c.lead.pubDate).getTime() - new Date(it.pubDate).getTime()) > 8 * 3600000) continue;
      let shared = 0; w.forEach(x => { if (c.w.has(x)) shared++; });
      if (shared >= 4 || (shared >= 3 && shared / Math.min(w.size, c.w.size) >= 0.6)) { home = c; break; }
    }
    if (home) { home.items.push(it); w.forEach(x => home!.w.add(x)); } else out.push({ lead: it, items: [it], w });
  }
  return out;
}
const ago = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${Math.floor(m / 1440)}d`; };

export default function BreakingRail({ situations, compact = false }: { situations: Situation[]; compact?: boolean }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    const load = () => fetch('/api/feed?limit=300').then(r => r.json()).then(d => { if (!dead) setItems((d.items || []) as NewsItem[]); }).catch(() => {});
    load(); const a = setInterval(load, 60000); const b = setInterval(() => setNow(Date.now()), 15000);
    return () => { dead = true; clearInterval(a); clearInterval(b); };
  }, []);

  const clusters = useMemo(() => {
    // conflict = hoort bij een lopende situatie, óf de kop of inleiding gaat aantoonbaar over geweld, krijgsmacht of sancties
    const inSituation = new Set(situations.flatMap(s => s.itemIds || []));
    const conflict = items.filter(i => i.category !== 'sport' && !isMarketItem(i) && (inSituation.has(i.id) || CONFLICT_RE.test(`${i.title} ${i.description || ''}`)))
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 160);
    return cluster(conflict).slice(0, compact ? 25 : 45);
  }, [items, compact, situations]);
  const quiet = situations.filter(s => s.latestPubDate && now - new Date(s.latestPubDate).getTime() > 45 * 60000).slice(0, 4);

  return (
    <div className="flex flex-col h-full bg-[#080808]">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1a1a1a]">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-[#dc2626] opacity-50 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[#dc2626]" /></span>
        <h2 className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.2em]">Breaking</h2>
        <span className="text-[10px] font-mono text-[#555] ml-auto">conflict only · newest first</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {clusters.length === 0 && <div className="text-[10px] font-mono text-[#333] py-10 text-center uppercase">Listening...</div>}
        {clusters.map(c => {
          const age = now - new Date(c.lead.pubDate).getTime(); const fresh = age < 10 * 60000;
          const srcs = [...new Map(c.items.map(i => [i.source, i])).values()];
          const first = [...c.items].sort((a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime())[0];
          const views = [...new Set(srcs.map(viewOf))]; const isOpen = open === c.lead.id;
          return (
            <div key={c.lead.id} className={`border-b border-[#141414] ${isOpen ? 'bg-[#e8760a]/[0.06]' : 'hover:bg-[#0d0d0d]'}`}>
              <button onClick={() => setOpen(isOpen ? null : c.lead.id)} className="w-full text-left px-3 py-2.5 grid grid-cols-[3.2rem_1fr] gap-2">
                <span className="text-[12px] font-mono tabular-nums text-white flex items-start gap-1.5 pt-px">{fresh && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse shrink-0" />}{ago(age)}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug text-[#eee]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>{c.lead.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-[#777]">
                    <span className={`px-1 border ${c.lead.sourceTier === 1 ? 'text-[#e8760a] border-[#b85a08]' : 'border-[#222]'}`}>T{c.lead.sourceTier || 3}</span>
                    <span>{c.lead.source}</span>
                    {srcs.length > 1 && <span className="flex items-center gap-1 text-[#aaa]">{views.map(v => <i key={v} title={v} className="inline-block w-[7px] h-[7px] rounded-full" style={{ background: VIEW_COLOR[v] }} />)}<span className="ml-0.5">{srcs.length} sources</span></span>}
                    {srcs.length > 1 && first.source !== c.lead.source && <span className="text-[#666]">first: {first.source}</span>}
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pl-[4.1rem] space-y-1.5">
                  {srcs.map(i => { const v = viewOf(i); return (
                    <a key={i.id} href={i.link} target="_blank" rel="noopener noreferrer" className="block group">
                      <span className="text-[9px] font-mono tracking-[0.15em] mr-2" style={{ color: VIEW_COLOR[v] }}>{v}</span>
                      <span className="text-[10px] font-mono text-[#888]">{i.source} · {ago(now - new Date(i.pubDate).getTime())}</span>
                      <span className="block text-[12px] leading-snug text-[#bbb] group-hover:text-[#e8760a]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>{i.title}</span>
                    </a>); })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {quiet.length > 0 && <div className="px-3 py-2 border-t border-dashed border-[#222] text-[10px] font-mono text-[#555] truncate">quiet: {quiet.map(s => `${s.title} ${ago(now - new Date(s.latestPubDate).getTime())}`).join(' · ')}</div>}
    </div>
  );
}
