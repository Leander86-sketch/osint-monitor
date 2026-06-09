'use client';

import { Situation } from '@/lib/types';

const SEV_W: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

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

export default function ThreatGauge({ situations }: { situations: Situation[] }) {
  const t = computeThreat(situations);
  const color = threatColor(t);
  const breaking = situations.filter(s => s.status === 'breaking').length;
  const active = situations.filter(s => s.status === 'active').length;
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
        {breaking > 0 && <span className="text-[#dc2626]">● {breaking} BREAKING</span>}
        <span className="text-[#888]">{active} ACTIVE</span>
        <span className="text-[#555]">{situations.length} TRACKED</span>
      </div>
    </div>
  );
}
