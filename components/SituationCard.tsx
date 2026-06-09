'use client';

import { useState } from 'react';
import { Situation, NewsItem } from '@/lib/types';

const SEV_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const TIER_COLOR: Record<number, string> = { 1: '#16a34a', 2: '#e8760a', 3: '#666' };

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
  if (m < 1) return 'NOW';
  if (m < 60) return m + 'm';
  if (h < 24) return h + 'h';
  return day + 'd';
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[1px] h-5">
      {data.map((v, i) => (
        <div key={i} className="w-[2px] rounded-t-sm" style={{ height: `${Math.max((v / max) * 100, v > 0 ? 12 : 0)}%`, backgroundColor: v > 0 ? color : '#161616' }} />
      ))}
    </div>
  );
}

interface Detail { items: NewsItem[]; related: { slug: string; title: string; severity: string }[] }

export default function SituationCard({ s, rank, onFilter, onFocus }: { s: Situation; rank: number; onFilter?: (kw: string) => void; onFocus?: (bbox: [number, number, number, number]) => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const sev = SEV_COLOR[s.severity] || '#6b7280';
  const m = s.metadata;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      setLoading(true);
      try {
        const res = await fetch(`/api/situations/${s.slug}`);
        if (!res.ok) { setDetail(null); return; }
        const data = await res.json();
        setDetail(data && Array.isArray(data.items) ? data : null);
      } catch { /* ignore */ } finally { setLoading(false); }
    }
  };

  const statusBadge = s.status === 'breaking'
    ? <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-[#dc2626] bg-[#dc2626]/10 animate-pulse">BREAKING</span>
    : s.status === 'active'
      ? <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-[#16a34a] bg-[#16a34a]/10">ACTIVE</span>
      : <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-[#555] bg-[#161616]">COOLING</span>;

  return (
    <div className="border border-[#1a1a1a] rounded bg-[#0a0a0a] overflow-hidden transition-all hover:border-[#e8760a]/30" style={{ borderLeft: `3px solid ${sev}` }}>
      <button onClick={toggle} className="w-full text-left px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-mono text-[#444] tabular-nums">{String(rank).padStart(2, '0')}</span>
          <span className="text-[13px] font-mono font-bold text-[#ddd] uppercase tracking-wide truncate">{s.title}</span>
          {!s.curated && <span className="text-[8px] font-mono px-1 py-0.5 rounded text-[#e8760a] border border-[#e8760a]/40">AUTO</span>}
          {statusBadge}
          <span className="ml-auto text-[11px] font-mono tabular-nums" style={{ color: sev }}>{s.severity.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <Spark data={m.sparkline} color={sev} />
          <div className="text-[10px] font-mono text-[#888] tabular-nums leading-tight">
            <div>1H <span className="text-[#ddd]">{m.velocity1h}</span> / 24H <span className="text-[#ddd]">{m.velocity24h}</span></div>
            <div>CORR <span className="text-[#e8760a]">{m.corroboration}</span> · T1·{m.sourceTierCounts.t1} T2·{m.sourceTierCounts.t2}</div>
          </div>
          <div className="ml-auto text-[12px] font-mono text-[#444]">{open ? '▾' : '▸'}</div>
        </div>
        {s.latestHeadline && (
          <div className="text-[11px] font-mono text-[#999] truncate"><span className="text-[#e8760a]">LATEST</span> {timeAgo(s.latestPubDate)} — {s.latestHeadline}</div>
        )}
      </button>

      {open && (
        <div className="border-t border-[#161616] px-3 py-2.5 bg-[#070707]">
          {loading && <div className="text-[10px] font-mono text-[#555] py-4 text-center">LOADING DOSSIER...</div>}
          {detail && (
            <>
              {onFocus && (
                <button onClick={() => onFocus(s.bbox)} className="mb-2 text-[9px] font-mono px-2 py-1 rounded border border-[#e8760a]/30 text-[#e8760a] hover:bg-[#e8760a]/10 uppercase tracking-wider">⊕ Focus on map</button>
              )}
              {s.actors.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {s.actors.map(a => <span key={a} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#111] text-[#999]">{a}</span>)}
                </div>
              )}
              <div className="space-y-0 max-h-80 overflow-y-auto">
                {detail.items.slice(0, 30).map(it => (
                  <a key={it.id} href={it.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 py-1 hover:bg-[#0c0c0c]">
                    <span className="text-[10px] font-mono text-[#555] tabular-nums w-9 shrink-0">{timeAgo(it.pubDate)}</span>
                    <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TIER_COLOR[it.sourceTier || 3] }} />
                    <span className="text-[10px] font-mono text-[#777] w-20 shrink-0 truncate">{it.source}</span>
                    <span className="text-[11px] text-[#bbb] leading-snug">{it.title}</span>
                  </a>
                ))}
              </div>
              {s.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#111]">
                  {s.keywords.map(k => (
                    <button key={k} onClick={() => onFilter?.(k)} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#1a1a1a] text-[#888] hover:text-[#e8760a] hover:border-[#e8760a]/40">{k}</button>
                  ))}
                </div>
              )}
              {detail.related.length > 0 && (
                <div className="mt-2 text-[10px] font-mono text-[#666]">RELATED: {detail.related.map(r => r.title).join(' · ')}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
