'use client';

import { useState } from 'react';
import { Situation } from '@/lib/types';

const SEV_W: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const STATUS_DOT: Record<string, string> = { breaking: '#dc2626', active: '#16a34a', cooling: '#555' };

export function computeThreat(situations: Situation[]): number {
  if (!situations.length) return 0;
  let score = 0;
  for (const s of situations) {
    const sev = SEV_W[s.severity] || 1;
    const vel = Math.min(s.metadata.velocity1h, 20) / 20;
    const live = s.status === 'breaking' ? 1.6 : s.status === 'active' ? 1 : 0.25;
    score += sev * live * (1 + vel);
  }
  return Math.round(100 * (1 - Math.exp(-score / 45)));
}

export function threatColor(t: number): string {
  return t >= 75 ? '#dc2626' : t >= 50 ? '#f97316' : t >= 25 ? '#e8760a' : '#16a34a';
}

export default function ThreatGauge({ situations, onFocus }: { situations: Situation[]; onFocus?: (bbox: [number, number, number, number]) => void }) {
  const [open, setOpen] = useState(false);
  const t = computeThreat(situations);
  const color = threatColor(t);
  const breaking = situations.filter(s => s.status === 'breaking');
  const active = situations.filter(s => s.status === 'active');
  const live = situations.filter(s => s.status !== 'cooling');
  return (
    <div className="border border-[#1a1a1a] rounded bg-[#0a0a0a] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono text-[#888] uppercase tracking-[0.2em]">Global Threat</span>
        <span className="text-2xl font-mono font-bold tabular-nums" style={{ color }}>{t}</span>
      </div>
      <div className="w-full h-2 bg-[#111] rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono">
        {breaking.length > 0 && (
          <button onClick={() => setOpen(o => !o)} className="text-[#dc2626] hover:text-[#f87171] flex items-center gap-1 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" /> {breaking.length} BREAKING
          </button>
        )}
        <button onClick={() => setOpen(o => !o)} className="text-[#888] hover:text-[#ccc] flex items-center gap-1 transition-colors">
          {active.length} ACTIVE {live.length > 0 && <span className="text-[8px] opacity-70">{open ? '▲' : '▼'}</span>}
        </button>
        <span className="text-[#555]">{situations.length} TRACKED</span>
      </div>
      {open && live.length > 0 && (
        <div className="mt-2 space-y-2 border-t border-[#1a1a1a] pt-2 max-h-52 overflow-y-auto">
          {live.map(s => (
            <div key={s.id} className="text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'breaking' ? 'animate-pulse' : ''}`} style={{ backgroundColor: STATUS_DOT[s.status] }} />
                <button onClick={() => onFocus?.(s.bbox)} className="text-[#ddd] hover:text-[#e8760a] uppercase truncate text-left transition-colors" title="Focus on map">{s.title}</button>
                <span className="text-[#666] ml-auto shrink-0 tabular-nums">{s.metadata.velocity1h}/h</span>
              </div>
              {s.latestHeadline && (
                <a href={s.latestLink} target="_blank" rel="noopener noreferrer" className="block text-[#888] hover:text-[#e8760a] leading-snug mt-0.5 pl-3 transition-colors">{s.latestHeadline} ↗</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
