'use client';

// Breaking-rail (19 sep 2026, /next): de lopende feed boven de vouw, altijd aan.
// Alleen conflictnieuws, nieuwste boven. Berichten over dezelfde gebeurtenis worden samengenomen: je ziet één regel met
// hoeveel verschillende bronnen het dragen en wie het eerst had; openklappen toont dezelfde gebeurtenis per bron, met de
// windstreek van die bron erbij (West, Rusland, Oekraïne, Midden-Oosten, Azië). Dat is de pluriformiteit, zichtbaar gemaakt.
import { useEffect, useMemo, useState } from 'react';
import { NewsItem, Situation } from '@/lib/types';
import { isMarketItem, CONFLICT_RE } from '@/components/LiveFeed';

import { VIEW_COLOR, viewOf, clusterEvents, agoShort as ago } from '@/lib/viewpoints';

interface NotableFlight { icao: string; callsign: string; badge: string; operator: string; type: string; lat: number; lng: number }

// Volgorde: de zeldzame, zware categorieën eerst; daarna wat in ons gebied vliegt (Europa, Middellandse Zee,
// Zwarte Zee, Midden-Oosten) boven de rest van de wereld. Maximaal zes regels, de rest als telling.
const BADGE_RANK = ['Doomsday plane', 'Nuclear C2', 'Gunship', 'Dictator Alert', 'SIGINT / recon', 'AEW', 'ASW patrol', 'UAV', 'Contractor ISR', 'Survey', 'Government'];
const inRegion = (f: NotableFlight) => f.lat >= 25 && f.lat <= 72 && f.lng >= -30 && f.lng <= 65;
function rankNotable(list: NotableFlight[]) {
  const rank = (f: NotableFlight) => { const i = BADGE_RANK.indexOf(f.badge); return (i < 0 ? 99 : i) + (inRegion(f) ? 0 : 50); };
  const sorted = [...list].sort((a, b) => rank(a) - rank(b));
  const shown = sorted.slice(0, 6);
  return { shown, more: sorted.length - shown.length };
}

export default function BreakingRail({ situations, compact = false }: { situations: Situation[]; compact?: boolean }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState<string | null>(null);
  const [notable, setNotable] = useState<NotableFlight[]>([]);

  useEffect(() => {
    let dead = false;
    const load = () => fetch('/api/feed?limit=300').then(r => r.json()).then(d => { if (!dead) setItems((d.items || []) as NewsItem[]); }).catch(() => {});
    load(); const a = setInterval(load, 60000); const b = setInterval(() => setNow(Date.now()), 15000);
    // Opvallende toestellen (plane-alert-db) uit dezelfde bron als de kaartlaag; om de 2 min.
    const loadAir = () => fetch('/api/flights').then(r => r.json()).then(d => { if (!dead) setNotable((d.notable || []) as NotableFlight[]); }).catch(() => {});
    loadAir(); const c = setInterval(loadAir, 120000);
    return () => { dead = true; clearInterval(a); clearInterval(b); clearInterval(c); };
  }, []);

  const air = useMemo(() => rankNotable(notable), [notable]);

  const clusters = useMemo(() => {
    // conflict = de tekst gaat aantoonbaar over geweld, krijgsmacht of sancties, én het bericht hoort bij een lopende situatie of zegt het al in de kop
    // (19 sep: 'weersverwachting Oekraïne' zat in de situatie Oekraïne en kwam zo in de rail)
    const inSituation = new Set(situations.flatMap(s => s.itemIds || []));
    const conflict = items.filter(i => i.category !== 'sport' && !isMarketItem(i) && CONFLICT_RE.test(`${i.title} ${i.description || ''}`) && (inSituation.has(i.id) || CONFLICT_RE.test(i.title)))
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 160);
    return clusterEvents(conflict).slice(0, compact ? 25 : 45);
  }, [items, compact, situations]);
  const quiet = situations.filter(s => s.latestPubDate && now - new Date(s.latestPubDate).getTime() > 45 * 60000).slice(0, 4);

  return (
    <div className="flex flex-col h-full bg-[#080808]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-[#dc2626] opacity-50 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[#dc2626]" /></span>
        <h2 title="Live feed" className="text-[12px] font-mono font-bold text-[#eee] uppercase tracking-[0.22em]">Breaking</h2>
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
              <button onClick={() => setOpen(isOpen ? null : c.lead.id)} title="Show sources" className="w-full text-left px-4 py-3.5 grid grid-cols-[3.6rem_1fr] gap-3">
                <span title="Age" className="text-[14px] font-mono tabular-nums text-white flex items-start gap-1.5 pt-px">{fresh && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse shrink-0" />}{ago(age)}</span>
                <span className="min-w-0">
                  <span className="block text-[15.5px] leading-snug text-[#f2f2f2]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>{c.lead.title}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-[#888]">
                    <span title="Source rank" className={`px-1 border ${c.lead.sourceTier === 1 ? 'text-[#e8760a] border-[#b85a08]' : 'border-[#222]'}`}>T{c.lead.sourceTier || 3}</span>
                    <span>{c.lead.source}</span>
                    {srcs.length > 1 && <span title="Viewpoints" className="flex items-center gap-1 text-[#aaa]">{views.map(v => <i key={v} title={v} className="inline-block w-[7px] h-[7px] rounded-full" style={{ background: VIEW_COLOR[v] }} />)}<span className="ml-0.5">{srcs.length} sources</span></span>}
                    {srcs.length > 1 && first.source !== c.lead.source && <span title="First report" className="text-[#666]">first: {first.source}</span>}
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pl-[5.35rem] space-y-2.5">
                  {srcs.map(i => { const v = viewOf(i); return (
                    <a key={i.id} href={i.link} target="_blank" rel="noopener noreferrer" title="Open article" className="block group">
                      <span className="text-[9px] font-mono tracking-[0.15em] mr-2" style={{ color: VIEW_COLOR[v] }}>{v}</span>
                      <span className="text-[10px] font-mono text-[#888]">{i.source} · {ago(now - new Date(i.pubDate).getTime())}</span>
                      <span className="block text-[13.5px] leading-snug text-[#c8c8c8] group-hover:text-[#e8760a]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>{i.title}</span>
                    </a>); })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {air.shown.length > 0 && (
        <a href="/?layers=flights" title="Notable aircraft airborne now (plane-alert-db) · open the map" className="block px-4 py-2.5 border-t border-dashed border-[#222] text-[11px] font-mono text-[#777] truncate hover:text-[#e8760a]">
          <span className="text-[#f97316]">in the air:</span> {air.shown.map(f => `${f.badge} · ${f.type}${f.operator ? ` (${f.operator})` : ''}`).join(' · ')}{air.more > 0 ? ` · +${air.more} elsewhere` : ''}
        </a>
      )}
      {quiet.length > 0 && <div title="No news" className="px-4 py-2.5 border-t border-dashed border-[#222] text-[11px] font-mono text-[#666] truncate">quiet: {quiet.map(s => `${s.title} ${ago(now - new Date(s.latestPubDate).getTime())}`).join(' · ')}</div>}
    </div>
  );
}
