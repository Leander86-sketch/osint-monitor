'use client';

import { useState, useEffect, useCallback } from 'react';

interface Escalation {
  id: string; at: number; slug: string; title: string;
  kind: 'new' | 'severity_up' | 'surge'; detail: string; severity: string;
}

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const KIND_LABEL: Record<string, string> = { new: 'NEW', severity_up: 'ESCALATING', surge: 'SURGE' };

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function EscalationStrip({ onFocus }: { onFocus?: (slug: string) => void }) {
  const [items, setItems] = useState<Escalation[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch('/api/situation-alerts');
      const d = await r.json();
      setItems(d.escalations || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    const i = setInterval(fetchAlerts, 60000);
    return () => clearInterval(i);
  }, [fetchAlerts]);

  // Only show escalations from the last 6h, not yet dismissed
  const cutoff = Date.now() - 6 * 3600_000;
  const visible = items.filter(e => e.at >= cutoff && !dismissed.has(e.id)).slice(0, 6);
  if (visible.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-5 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a] overflow-x-auto">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#dc2626] shrink-0 animate-pulse">⚠ Escalations</span>
      <div className="flex items-center gap-2">
        {visible.map(e => (
          <button
            key={e.id}
            onClick={() => onFocus?.(e.slug)}
            title={`${e.detail} · ${ago(e.at)} ago`}
            className="group flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded border border-[#1a1a1a] hover:border-current transition-all"
            style={{ color: SEV_COLOR[e.severity] || '#888' }}
          >
            <span className="text-[9px] font-mono font-bold tracking-wider">{KIND_LABEL[e.kind]}</span>
            <span className="text-[11px] font-mono text-[#ccc] max-w-[200px] truncate group-hover:text-white">{e.title}</span>
            <span className="text-[9px] font-mono text-[#555]">{ago(e.at)}</span>
            <span onClick={(ev) => { ev.stopPropagation(); setDismissed(p => new Set(p).add(e.id)); }}
              className="text-[#444] hover:text-[#aaa] text-[12px] leading-none ml-0.5">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
