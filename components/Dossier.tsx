'use client';

// Dossier (19 sep 2026, /next): één situatie op volle breedte, om doorheen te bladeren als door een tijdschrift.
// Kern is de BRONNENWAAIER: dezelfde situatie per windstreek naast elkaar (Western, Russian, Ukrainian, Middle East, Asian),
// en daaronder de gebeurtenissen die door meerdere windstreken zijn gemeld, met elke kop naast elkaar.
import { useEffect, useMemo, useState } from 'react';
import { NewsItem, Situation } from '@/lib/types';
import { VIEWS, VIEW_COLOR, VIEW_LABEL, View, viewOf, isStateMedia, clusterEvents, agoShort } from '@/lib/viewpoints';

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const sans = { fontFamily: 'var(--font-geist-sans), sans-serif' };

export default function Dossier({ situations, slug, onClose, onGo, onLocate }: { situations: Situation[]; slug: string; onClose: () => void; onGo: (slug: string) => void; onLocate: (slug: string) => void }) {
  const idx = situations.findIndex(s => s.slug === slug);
  const sit = idx >= 0 ? situations[idx] : null;
  const prev = idx > 0 ? situations[idx - 1] : situations[situations.length - 1];
  const next = idx >= 0 && idx < situations.length - 1 ? situations[idx + 1] : situations[0];
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let dead = false; setLoading(true); setItems([]);
    fetch(`/api/situations/${slug}`).then(r => r.json()).then(d => { if (!dead) { setItems((d.items || []) as NewsItem[]); setLoading(false); } }).catch(() => { if (!dead) setLoading(false); });
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { dead = true; clearInterval(t); };
  }, [slug]);

  // bladeren werkt ook stil met de pijltjes en Escape; bewust geen hints in beeld
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowRight' && next) onGo(next.slug); else if (e.key === 'ArrowLeft' && prev) onGo(prev.slug); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onGo, next, prev]);
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, []);

  const recent = useMemo(() => [...items].filter(i => now - new Date(i.pubDate).getTime() < 72 * 3600000).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()), [items, now]);
  const byView = useMemo(() => { const m = new Map<View, NewsItem[]>(); for (const i of recent) { const v = viewOf(i); m.set(v, [...(m.get(v) || []), i]); } return m; }, [recent]);
  const cols = VIEWS.filter(v => (byView.get(v) || []).length > 0);
  const shared = useMemo(() => clusterEvents(recent, 12).map(c => ({ c, views: [...new Set(c.items.map(viewOf))] })).filter(x => x.views.length >= 2).slice(0, 6), [recent]);

  if (!sit) return null;
  const sev = SEV_COLOR[sit.severity] || '#6b7280';

  return (
    <div className="fixed inset-0 z-[2000] bg-[#030303]/95 backdrop-blur-sm overflow-y-auto" role="dialog" aria-label={`Dossier ${sit.title}`}>
      <div className="max-w-[1500px] mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button title="Previous dossier" onClick={() => prev && onGo(prev.slug)} className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] border border-[#222] hover:border-[#e8760a] px-3 py-2">‹ {prev?.title}</button>
          <span className="text-[10px] font-mono text-[#555] tabular-nums">{idx + 1} / {situations.length}</span>
          <button title="Next dossier" onClick={() => next && onGo(next.slug)} className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] border border-[#222] hover:border-[#e8760a] px-3 py-2">{next?.title} ›</button>
          <button title="Close dossier" onClick={onClose} className="ml-auto text-[11px] font-mono uppercase tracking-[0.15em] text-[#bbb] hover:text-[#e8760a] border border-[#222] px-3 py-2">✕ Close</button>
        </div>

        <div className="border-l-4 pl-5 mb-7" style={{ borderColor: sev }}>
          <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: sev }}>{sit.severity} · {sit.status} · corroboration {sit.metadata.corroboration}</div>
          <h1 className="text-[34px] leading-tight text-white mt-1" style={sans}>{sit.title}</h1>
          {sit.latestHeadline && <a href={sit.latestLink} target="_blank" rel="noopener noreferrer" className="block mt-2 text-[17px] text-[#ccc] hover:text-[#e8760a] max-w-4xl" style={sans}><span className="text-[#e8760a] font-mono text-[11px] tracking-[0.2em] mr-2">LATEST {agoShort(now - new Date(sit.latestPubDate).getTime())}</span>{sit.latestHeadline}</a>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#888]">
            <span title="Last hour">1H <b className="text-white font-normal">{sit.metadata.velocity1h}</b></span><span title="Last day">24H <b className="text-white font-normal">{sit.metadata.velocity24h}</b></span>
            <span title="Top-rank sources">T1·{sit.metadata.sourceTierCounts.t1} T2·{sit.metadata.sourceTierCounts.t2}</span>
            {sit.actors.map(a => <span key={a} className="px-1.5 py-0.5 bg-[#111] text-[#999]">{a}</span>)}
            <button title="Locate" onClick={() => onLocate(sit.slug)} className="ml-2 text-[#e8760a] border-b border-[#b85a08] hover:text-white">show on map →</button>
          </div>
        </div>

        {loading && <div className="text-[11px] font-mono text-[#555] py-16 text-center uppercase tracking-[0.2em]">Loading dossier...</div>}

        {!loading && shared.length > 0 && (
          <section className="mb-8">
            <h2 title="Same event" className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em] mb-3">Same event, different words</h2>
            <div className="space-y-3">
              {shared.map(({ c, views }) => (
                <div key={c.lead.id} className="border border-[#1a1a1a] bg-[#080808]">
                  <div className="grid gap-px bg-[#1a1a1a]" style={{ gridTemplateColumns: `repeat(${Math.min(views.length, 4)}, minmax(0, 1fr))` }}>
                    {views.slice(0, 4).map(v => { const it = c.items.filter(i => viewOf(i) === v).sort((a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime())[0]; return (
                      <a key={v} href={it.link} target="_blank" rel="noopener noreferrer" title="Open article" className="block bg-[#080808] p-3.5 hover:bg-[#0d0d0d] group">
                        <div className="text-[10px] font-mono tracking-[0.18em] mb-1.5" style={{ color: VIEW_COLOR[v] }}>{VIEW_LABEL[v].toUpperCase()}</div>
                        <div className="text-[15px] leading-snug text-[#eee] group-hover:text-[#e8760a]" style={sans}>{it.title}</div>
                        <div className="mt-2 text-[10px] font-mono text-[#777]">{it.source}{isStateMedia(it.source) && <span title="State media" className="ml-1.5 text-[#a16207]">state</span>} · T{it.sourceTier || 3} · {agoShort(now - new Date(it.pubDate).getTime())}</div>
                      </a>); })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && (
          <section className="mb-10">
            <h2 title="By viewpoint" className="text-[11px] font-mono font-bold text-[#ddd] uppercase tracking-[0.22em] mb-3">Who reports what · last 72 hours</h2>
            {cols.length === 0 ? <div className="text-[11px] font-mono text-[#555] py-10 text-center uppercase">No reports in the last 72 hours</div> : (
              <div className="grid gap-px bg-[#1a1a1a] border border-[#1a1a1a]" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
                {cols.map(v => { const list = byView.get(v) || []; const srcs = new Set(list.map(i => i.source)); return (
                  <div key={v} className="bg-[#080808] min-w-0">
                    <div className="px-3.5 py-3 border-b border-[#1a1a1a] flex items-baseline gap-2" style={{ boxShadow: `inset 0 2px 0 ${VIEW_COLOR[v]}` }}>
                      <span className="text-[12px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: VIEW_COLOR[v] }}>{VIEW_LABEL[v]}</span>
                      <span title="Reports and sources" className="text-[10px] font-mono text-[#666] ml-auto">{list.length} · {srcs.size} src</span>
                    </div>
                    <div className="max-h-[52vh] overflow-y-auto">
                      {list.slice(0, 14).map((it, k) => (
                        <a key={it.id} href={it.link} target="_blank" rel="noopener noreferrer" title="Open article" className="block px-3.5 py-3 border-b border-[#121212] hover:bg-[#0d0d0d] group">
                          <div className={`${k === 0 ? 'text-[15px] text-white' : 'text-[13px] text-[#c4c4c4]'} leading-snug group-hover:text-[#e8760a]`} style={sans}>{it.title}</div>
                          <div className="mt-1.5 text-[10px] font-mono text-[#777]">{agoShort(now - new Date(it.pubDate).getTime())} · {it.source}{isStateMedia(it.source) && <span title="State media" className="ml-1.5 text-[#a16207]">state</span>} · T{it.sourceTier || 3}</div>
                        </a>
                      ))}
                    </div>
                  </div>); })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
