'use client';

// Breaking-band (18 sep 2026, /next): het belangrijkste wat Argus weet, bovenaan.
// Breekt er een situatie (status 'breaking' = ≥4 berichten in een uur, of critical met ≥2 in een uur), dan toont de band
// de laatste kop, hoe lang geleden de eerste melding was, welke bron het eerst had en hoeveel bronnen het nu dragen.
import { useEffect, useState } from 'react';
import { Situation } from '@/lib/types';

interface Item { title: string; source: string; pubDate: string; link?: string; sourceTier?: number }
const WINDOW_MS = 3 * 3600000;

function ago(ms: number): string { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; }

export default function BreakingBand({ situations, onFocus, onWatch, demo = false }: { situations: Situation[]; onFocus: (slug: string) => void; onWatch: () => void; demo?: boolean }) {
  const sit = situations.find(s => s.status === 'breaking') || situations.find(s => s.severity === 'critical' && s.metadata.velocity1h >= 2) || (demo ? situations[0] : null) || null;
  const [items, setItems] = useState<Item[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!sit) { setItems([]); return; }
    let dead = false;
    const load = () => fetch(`/api/situations/${sit.slug}`).then(r => r.json()).then(d => { if (!dead) setItems((d.items || []) as Item[]); }).catch(() => {});
    load(); const i = setInterval(load, 60000);
    return () => { dead = true; clearInterval(i); };
  }, [sit?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sit) return null;
  const recent = items.filter(i => now - new Date(i.pubDate).getTime() < WINDOW_MS).sort((a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime());
  const first = recent[0];
  const sources = [...new Set(recent.map(i => i.source))];
  const dots = Math.min(5, sources.length);
  const latestAge = sit.latestPubDate ? now - new Date(sit.latestPubDate).getTime() : 0;

  return (
    <section aria-label="Breaking" className="border-b border-[#dc2626]/70 px-5 py-5" style={{ background: 'linear-gradient(90deg, rgba(220,38,38,.16), rgba(220,38,38,.03) 60%, transparent)' }}>
      <div className="flex items-start gap-4">
        <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full rounded-full bg-[#dc2626] opacity-60 animate-ping" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#dc2626]" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em]"><span className="text-white">Breaking</span><span className="text-[#dc2626] ml-3">{sit.title} · {sit.severity} · {sit.metadata.velocity1h} in the last hour</span></div>
          <a href={sit.latestLink || '#'} target="_blank" rel="noopener noreferrer" className="block mt-1.5 text-[17px] leading-snug text-white hover:text-[#e8760a] transition-colors" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>{sit.latestHeadline}</a>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#888]">
            {first && <><span title="Earliest source" className="text-[9px] tracking-[0.18em] text-[#e8760a] border border-[#b85a08] px-1.5 py-px">FIRST REPORT</span><span>{first.source} · {new Date(first.pubDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></>}
            <span className="flex items-center gap-1" title={sources.join(' · ')}>{Array.from({ length: 5 }).map((_, i) => <i key={i} className="inline-block w-[7px] h-[7px] rounded-full" style={i < dots ? { background: '#e8760a' } : { border: '1px solid #333' }} />)}<span className="ml-1">{sources.length} {sources.length === 1 ? 'source' : 'sources'} in 3 h</span></span>
            <button title="Locate" onClick={() => onFocus(sit.slug)} className="text-[#e8760a] border-b border-[#b85a08] hover:text-white">show on map →</button>
            <button title="Bigger video" onClick={onWatch} className="text-[#e8760a] border-b border-[#b85a08] hover:text-white">watch live →</button>
          </div>
        </div>
        <div title="Latest report" className="text-right shrink-0"><div className="text-[22px] font-mono font-light text-white tabular-nums">{ago(latestAge)}</div><div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#666]">since latest report</div></div>
      </div>
    </section>
  );
}
