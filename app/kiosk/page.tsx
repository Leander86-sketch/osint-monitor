'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Situation } from '@/lib/types';
import EventMap from '@/components/EventMap';
import { computeThreat, threatColor } from '@/components/ThreatGauge';

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const ROTATE_MS = 12000;

export default function Kiosk() {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [time, setTime] = useState('');
  const [idx, setIdx] = useState(0);
  const [focusBbox, setFocusBbox] = useState<[number, number, number, number] | null>(null);

  const fetchSituations = useCallback(async () => {
    try {
      const r = await fetch('/api/situations');
      const d = await r.json();
      const list: Situation[] = (d.situations || []).slice().sort(
        (a: Situation, b: Situation) => {
          const rank = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
          return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
        }
      );
      setSituations(list);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSituations();
    const i = setInterval(fetchSituations, 60000);
    return () => clearInterval(i);
  }, [fetchSituations]);

  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    u();
    const i = setInterval(u, 1000);
    return () => clearInterval(i);
  }, []);

  // auto-rotate through situations
  useEffect(() => {
    if (situations.length === 0) return;
    const i = setInterval(() => setIdx(p => (p + 1) % situations.length), ROTATE_MS);
    return () => clearInterval(i);
  }, [situations.length]);

  useEffect(() => {
    const cur = situations[idx];
    if (cur?.bbox) setFocusBbox(cur.bbox);
  }, [idx, situations]);

  const cur = situations[idx];
  const threat = computeThreat(situations);

  return (
    <div className="fixed inset-0 bg-[#050505] text-[#e5e5e5] overflow-hidden">
      <div className="absolute inset-0">
        <EventMap focusBbox={focusBbox} situations={situations} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-8 py-4 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none">
        <div className="font-mono">
          <span className="text-[20px] tracking-[0.3em] font-semibold">ARGUS</span>
          <span className="text-[12px] text-[#666] ml-3 uppercase tracking-widest">Kiosk — Always Monitoring</span>
        </div>
        <div className="text-right font-mono">
          <div className="text-[26px] tabular-nums leading-none">{time}</div>
          <div className="text-[11px] uppercase tracking-widest mt-1" style={{ color: threatColor(threat) }}>
            Threat {threat}/100
          </div>
        </div>
      </div>

      {/* Current situation card */}
      {cur && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] px-8 py-6 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: SEV_COLOR[cur.severity] }} />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: SEV_COLOR[cur.severity] }}>
              {cur.severity} — {cur.status}
            </span>
            <span className="text-[11px] font-mono text-[#555] uppercase tracking-widest">
              {idx + 1} / {situations.length}
            </span>
          </div>
          <h1 className="text-[34px] font-semibold leading-tight mb-1.5 max-w-[80%]">{cur.title}</h1>
          {cur.latestHeadline && (
            <p className="text-[15px] text-[#999] font-mono max-w-[70%] truncate">{cur.latestHeadline}</p>
          )}
          {/* progress dots */}
          <div className="flex gap-1.5 mt-4">
            {situations.slice(0, 24).map((_, i) => (
              <div key={i} className="h-0.5 rounded-full transition-all" style={{
                width: i === idx ? 28 : 14,
                backgroundColor: i === idx ? threatColor(threat) : '#1f1f1f'
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
