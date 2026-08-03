'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface LayerInfo { label: string; shows: string; source: string; cadence: string }
interface SourcesData {
  manifesto: string;
  layers: LayerInfo[];
  intel: { label: string; source: string }[];
  feeds: { total: number; byRegion: Record<string, number>; byTier: Record<string, number> };
  caveats: string[];
}

export default function SourcesPanel() {
  const [open, setOpen] = useState(false);
  const [teasing, setTeasing] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [data, setData] = useState<SourcesData | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // First visit: announce the button once (label shows, then collapses to icon).
  // Never opens the panel automatically; localStorage keeps returning visitors calm.
  useEffect(() => {
    // Every visit: a short attention pulse on the icon.
    const p1 = setTimeout(() => setPulsing(true), 800);
    const p2 = setTimeout(() => setPulsing(false), 4500);
    let seen = false;
    try { seen = localStorage.getItem('argus-sources-teased') === '1'; } catch { /* ignore */ }
    if (seen) return () => { clearTimeout(p1); clearTimeout(p2); };
    // First visit only: also expand the label once.
    const t1 = setTimeout(() => setTeasing(true), 1200);
    const t2 = setTimeout(() => {
      setTeasing(false);
      try { localStorage.setItem('argus-sources-teased', '1'); } catch { /* ignore */ }
    }, 6500);
    return () => { clearTimeout(p1); clearTimeout(p2); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const load = useCallback(async () => {
    if (data) return;
    try {
      const res = await fetch('/api/sources');
      setData(await res.json());
    } catch { /* ignore */ }
  }, [data]);

  const openPanel = () => { setTeasing(false); setPulsing(false); setOpen(true); load(); };

  // Esc closes; only user action closes (never auto-collapses while reading)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={openPanel}
        title="What am I looking at? — sources & method"
        className={`flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded px-2 py-1 transition-all ${teasing ? 'text-[#e8760a] bg-[#e8760a]/10 ring-1 ring-[#e8760a]/40' : 'text-[#888] hover:text-[#e8760a]'}`}
      >
        <span className={(teasing || pulsing) ? 'animate-pulse text-[#e8760a]' : ''}>ⓘ</span>
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-500 ${teasing ? 'max-w-[220px] opacity-100' : 'max-w-0 opacity-0'}`}>
          what am I looking at?
        </span>
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-start justify-center p-4 sm:p-8 bg-black/80 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#222] rounded-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a] sticky top-0 bg-[#0a0a0a] rounded-t-lg">
              <h2 className="text-[12px] font-mono font-bold text-[#e8760a] uppercase tracking-[0.2em]">What am I looking at?</h2>
              <button onClick={() => setOpen(false)} className="text-[#666] hover:text-[#ccc] text-lg leading-none px-1">×</button>
            </div>
            <div className="px-5 py-4 font-mono text-[12px] text-[#bbb] space-y-5">
              {!data && <div className="text-[#666] py-6 text-center">Loading…</div>}
              {data && <>
                <p className="text-[#ccc] leading-relaxed">{data.manifesto}</p>

                <div>
                  <h3 className="text-[10px] text-[#666] uppercase tracking-[0.2em] mb-2">Map layers · {data.layers.length}</h3>
                  <div className="space-y-1.5">
                    {data.layers.map(l => (
                      <div key={l.label} className="flex flex-wrap items-baseline gap-x-2 border-b border-[#111] pb-1">
                        <span className="text-[#e8760a] w-16 shrink-0">{l.label}</span>
                        <span className="text-[#ccc] flex-1 min-w-[140px]">{l.shows}</span>
                        <span className="text-[#777] text-[11px]">{l.source} · {l.cadence}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] text-[#666] uppercase tracking-[0.2em] mb-2">News & intel · {data.feeds.total} feeds</h3>
                  <p className="text-[#999] leading-relaxed mb-2">
                    {data.feeds.total} tiered news feeds across {Object.keys(data.feeds.byRegion).length} regions
                    ({Object.entries(data.feeds.byRegion).map(([r, n]) => `${r} ${n}`).join(' · ')}),
                    clustered into live situations. Corroboration grade A/B/C reflects how many independent, high-tier sources back a situation.
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#888]">
                    {data.intel.map(p => (<span key={p.label}><span className="text-[#aaa]">{p.label}</span> — {p.source}</span>))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] text-[#666] uppercase tracking-[0.2em] mb-2">Honest limits</h3>
                  <ul className="space-y-1 text-[#999] text-[11px]">
                    {data.caveats.map((c, i) => (<li key={i} className="flex gap-2"><span className="text-[#555]">·</span><span>{c}</span></li>))}
                  </ul>
                </div>

                <div className="pt-1 text-[11px] text-[#666] border-t border-[#1a1a1a]">
                  Open source (AGPL-3.0) · <a href="https://github.com/Leander86-sketch/osint-monitor" target="_blank" rel="noopener" className="text-[#888] hover:text-[#e8760a]">source on GitHub</a> · alerts on <a href="https://x.com/ArgusDashboard" target="_blank" rel="noopener" className="text-[#888] hover:text-[#e8760a]">X</a>
                </div>
              </>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
