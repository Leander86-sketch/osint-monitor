'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Situation } from '@/lib/types';

const LAYERS: { id: string; label: string }[] = [
  { id: 'flights', label: 'FLIGHT' }, { id: 'satellites', label: 'SATELLITE' },
  { id: 'conflicts', label: 'CONFLICT' }, { id: 'carriers', label: 'CVN' },
  { id: 'cameras', label: 'CAM' }, { id: 'sentiment', label: 'TONE' },
  { id: 'displacement', label: 'DISP' }, { id: 'chokepoints', label: 'CHOKE' },
  { id: 'hazards', label: 'HAZARD' }, { id: 'firms', label: 'THERMAL' },
  { id: 'frontline', label: 'FRONT' }, { id: 'outages', label: 'NET' },
];
const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };

type Item =
  | { kind: 'situation'; id: string; label: string; sub: string; severity: string; slug: string }
  | { kind: 'layer'; id: string; label: string; sub: string };

export default function CommandPalette({ situations, onFocusSituation }:
  { situations: Situation[]; onFocusSituation: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd-K / Ctrl-K toggle, Esc close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const items: Item[] = useMemo(() => {
    const sit: Item[] = situations.map(s => ({
      kind: 'situation', id: s.slug, label: s.title, sub: `${s.severity} · ${s.status}`,
      severity: s.severity, slug: s.slug,
    }));
    const lay: Item[] = LAYERS.map(l => ({
      kind: 'layer', id: l.id, label: `Toggle ${l.label} layer`, sub: 'map layer',
    }));
    return [...sit, ...lay];
  }, [situations]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items.slice(0, 12);
    return items.filter(i => i.label.toLowerCase().includes(t) || i.sub.toLowerCase().includes(t)).slice(0, 12);
  }, [q, items]);

  useEffect(() => { if (sel >= filtered.length) setSel(0); }, [filtered.length, sel]);

  const run = (item: Item) => {
    if (item.kind === 'situation') onFocusSituation(item.slug);
    else window.dispatchEvent(new CustomEvent('argus:toggle-layer', { detail: item.id }));
    setOpen(false);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && filtered[sel]) { e.preventDefault(); run(filtered[sel]); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}>
      <div className="w-[92%] max-w-[560px] bg-[#0a0a0a] border border-[#222] rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={onInputKey}
          placeholder="Jump to a situation or toggle a layer…"
          className="w-full bg-transparent px-4 py-3.5 text-[15px] text-[#e5e5e5] font-mono outline-none border-b border-[#1a1a1a] placeholder:text-[#555]"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] font-mono text-[#555]">No matches</div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.kind + item.id}
              onMouseEnter={() => setSel(i)}
              onClick={() => run(item)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${i === sel ? 'bg-[#161616]' : ''}`}
            >
              {item.kind === 'situation' ? (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEV_COLOR[(item as Extract<Item,{kind:'situation'}>).severity] || '#666' }} />
              ) : (
                <span className="text-[10px] font-mono text-[#666] shrink-0 w-2 text-center">⊞</span>
              )}
              <span className="text-[13px] font-mono text-[#e5e5e5] truncate flex-1">{item.label}</span>
              <span className="text-[10px] font-mono text-[#555] uppercase tracking-wider shrink-0">{item.sub}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-[#1a1a1a] text-[10px] font-mono text-[#444]">
          <span>↑↓ navigate · ↵ select · esc close</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  );
}
