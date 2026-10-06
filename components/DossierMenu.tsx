'use client';

// DOSSIERS-knop in de header (6 okt 2026, Leander: "maak een 'go to dossiers' knop bovenin prominenter").
// Eén gevulde oranje knop, op elk schermformaat zichtbaar, met een uitklaplijst: het Focus-dossier (Hybrid Europe)
// en de gecureerde situaties, elk met een eigen pagina onder /s/<slug>.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Situation } from '@/lib/types';

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };

export default function DossierMenu({ situations }: { situations: Situation[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 8 - 352)) });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { const t = e.target as Node; if (ref.current?.contains(t) || menuRef.current?.contains(t)) return; setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const curated = situations.filter(s => s.curated);
  const auto = situations.filter(s => !s.curated).slice(0, 4);

  return (
    <div ref={ref} className="relative ml-2">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} title="Go to the dossiers: Focus and every situation page"
        className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-sm bg-[#e8760a] text-[#050505] hover:bg-[#f28a24] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#050505]/70" />Dossiers<span className="text-[9px]">{open ? '▴' : '▾'}</span>
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1500 }} className="w-[22rem] max-w-[calc(100vw-1rem)] bg-[#0a0a0a] border border-[#2a2a2a] shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <a href="/focus" className="block px-4 py-3 border-b border-[#1a1a1a] hover:bg-[#e8760a]/10 group">
            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#e8760a]">Focus · one pattern, many countries</div>
            <div className="text-[14px] text-[#f0f0f0] group-hover:text-[#e8760a] mt-0.5" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>Hybrid Europe — drones, sabotage, cables, jamming</div>
            <div className="text-[10px] font-mono text-[#777] mt-0.5">documented 2022–2025 + reported 2026 · map, timeline, sources</div>
          </a>
          <div className="px-4 pt-2.5 pb-1 text-[9px] font-mono uppercase tracking-[0.22em] text-[#777]">Situations · each has its own page</div>
          <div className="max-h-[60vh] overflow-y-auto pb-1">
            {curated.map(s => (
              <a key={s.id} href={`/s/${s.slug}`} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-[#e8760a]/10 group">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SEV_COLOR[s.severity] || '#6b7280' }} />
                <span className="text-[12px] font-mono text-[#ddd] group-hover:text-[#e8760a] truncate">{s.title}</span>
                {s.dossier && <span title="Hand-compiled dossier: what's confirmed and what isn't, with sources" className="text-[8px] font-mono font-bold px-1 py-px bg-[#e8760a]/15 text-[#e8760a] border border-[#e8760a]/40 uppercase tracking-wider shrink-0">dossier</span>}
                <span className="ml-auto text-[9px] font-mono text-[#555] uppercase tracking-wider shrink-0">{s.status}{s.metadata?.articleCount ? ` · ${s.metadata.articleCount}` : ''}</span>
              </a>
            ))}
            {auto.length > 0 && <div className="px-4 pt-2 pb-1 text-[9px] font-mono uppercase tracking-[0.22em] text-[#555]">Emerging (automatic)</div>}
            {auto.map(s => (
              <a key={s.id} href={`/s/${s.slug}`} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-[#e8760a]/10 group">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SEV_COLOR[s.severity] || '#6b7280' }} />
                <span className="text-[12px] font-mono text-[#aaa] group-hover:text-[#e8760a] truncate">{s.title}</span>
              </a>
            ))}
            {situations.length === 0 && <div className="px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">Loading…</div>}
          </div>
          <button onClick={() => { setOpen(false); document.getElementById('band-situations')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full text-left px-4 py-2.5 border-t border-[#1a1a1a] text-[10px] font-mono text-[#888] hover:text-[#e8760a] uppercase tracking-[0.15em]">All situations on this page ↓</button>
        </div>,
        document.body
      )}
    </div>
  );
}
