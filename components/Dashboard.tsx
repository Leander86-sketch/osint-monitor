'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from '@/lib/types';

interface DashboardProps {
  onKeywordClick?: (keyword: string) => void;
  activeKeyword?: string;
}

export default function Dashboard({ onKeywordClick, activeKeyword }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-4 h-4 border border-[#e8760a]/30 border-t-[#e8760a] rounded-full animate-spin" />
      </div>
    );
  }

  const maxTrend = Math.max(...stats.trendData.map(t => t.count), 1);
  const maxKeyword = Math.max(...stats.topKeywords.map(k => k.count), 1);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a]">
        <h2 className="text-[11px] font-mono font-bold text-[#ddd]2 uppercase tracking-[0.2em]">Situation Overview</h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="border border-[#1a1a1a] rounded p-2.5 bg-[#0a0a0a]">
          <div className="text-[12px] text-[#ddd] uppercase tracking-wider font-mono">Total</div>
          <div className="text-xl font-bold text-[#ccc] mt-1 font-mono">{stats.totalArticles}</div>
        </div>
        <div className="border border-[#1a1a1a] rounded p-2.5 bg-[#0a0a0a]">
          <div className="text-[12px] text-[#ddd] uppercase tracking-wider font-mono">1H</div>
          <div className="text-xl font-bold text-[#e8760a] mt-1 font-mono">{stats.articlesLastHour}</div>
        </div>
        <div className="border border-[#1a1a1a] rounded p-2.5 bg-[#0a0a0a]">
          <div className="text-[12px] text-[#ddd] uppercase tracking-wider font-mono">24H</div>
          <div className="text-xl font-bold text-[#bbb] mt-1 font-mono">{stats.articlesLast24h}</div>
        </div>
      </div>

      {/* 24h Activity Chart */}
      <div className="px-3 pb-3">
        <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em] mb-2">Activity — 24h</h3>
        <div className="flex items-end gap-[1px] h-14 border border-[#1a1a1a] rounded bg-[#0a0a0a] p-1.5">
          {stats.trendData.map((point, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max((point.count / maxTrend) * 100, point.count > 0 ? 4 : 0)}%`,
                backgroundColor: point.count > 0 ? `rgba(232, 118, 10, ${0.3 + (point.count / maxTrend) * 0.5})` : 'transparent',
              }}
              title={`${point.hour}: ${point.count}`}
            />
          ))}
        </div>
      </div>

      {/* Top Sources */}
      <div className="px-3 pb-3">
        <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em] mb-2">Sources</h3>
        <div className="space-y-1">
          {stats.topSources.map(source => (
            <div key={source.name} className="flex items-center gap-2">
              <span className="text-[12px] text-[#ddd]2 w-24 truncate font-mono">{source.name}</span>
              <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(source.count / stats.totalArticles) * 100}%`,
                    backgroundColor: '#e8760a',
                    opacity: 0.4,
                  }}
                />
              </div>
              <span className="text-[11px] text-[#ccc] w-5 text-right font-mono">{source.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Keywords — now clickable */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em]">Trending Intel</h3>
          {activeKeyword && (
            <button
              onClick={() => onKeywordClick?.('')}
              className="text-[12px] font-mono text-[#e8760a]/50 hover:text-[#e8760a] transition-colors uppercase tracking-wider"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {stats.topKeywords.map(kw => {
            const intensity = Math.min(kw.count / maxKeyword, 1);
            const isActive = activeKeyword === kw.word;
            return (
              <button
                key={kw.word}
                onClick={() => onKeywordClick?.(kw.word)}
                className={`font-mono border rounded px-1.5 py-0.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#e8760a]/60 bg-[#e8760a]/15 shadow-[0_0_8px_rgba(232,118,10,0.2)]'
                    : 'border-[#1a1a1a] hover:border-[#e8760a]/30 hover:bg-[#e8760a]/5'
                }`}
                style={{
                  fontSize: `${9 + intensity * 3}px`,
                  color: isActive
                    ? '#e8760a'
                    : `rgba(232, 118, 10, ${0.3 + intensity * 0.7})`,
                }}
              >
                {kw.word} <span className={isActive ? 'opacity-70' : 'opacity-40'}>{kw.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nuclear Threat Level */}
      <div className="px-3 pb-3">
        <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em] mb-2">Nuclear Threat</h3>
        <div className="border border-[#1a1a1a] rounded bg-[#0a0a0a] p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-[#888] uppercase">Doomsday Clock</span>
            <span className="text-[14px] font-mono font-bold text-[#dc2626]">85 sec</span>
          </div>
          <div className="w-full h-1.5 bg-[#111] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full bg-gradient-to-r from-[#dc2626] to-[#f97316]" style={{ width: '93%' }} />
          </div>
          <div className="text-[10px] font-mono text-[#555]">Closest to midnight since 1947</div>
        </div>
        <div className="mt-2 space-y-1">
          {[
            { country: 'Russia', warheads: 5580, color: '#dc2626' },
            { country: 'USA', warheads: 5044, color: '#3b82f6' },
            { country: 'China', warheads: 500, color: '#eab308' },
            { country: 'France', warheads: 290, color: '#8b5cf6' },
            { country: 'UK', warheads: 225, color: '#22c55e' },
            { country: 'Pakistan', warheads: 170, color: '#f97316' },
            { country: 'India', warheads: 172, color: '#06b6d4' },
            { country: 'Israel', warheads: 90, color: '#6b7280' },
            { country: 'N. Korea', warheads: 50, color: '#ef4444' },
          ].map(n => (
            <div key={n.country} className="flex items-center gap-2">
              <span className="text-[10px] text-[#888] w-14 font-mono">{n.country}</span>
              <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(n.warheads / 5580) * 100}%`, backgroundColor: n.color, opacity: 0.5 }} />
              </div>
              <span className="text-[10px] text-[#666] w-10 text-right font-mono">{n.warheads.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="text-[9px] font-mono text-[#444] mt-1.5">Source: FAS Nuclear Notebook 2025</div>
      </div>

      {/* Military Spending */}
      <MilSpendingWidget />

      {/* Arms Trade */}
      <ArmsTradeWidget />
    </div>
  );
}

function ArmsTradeWidget() {
  // SIPRI Arms Transfers Database 2019-2023 top exporters (TIV share %)
  const exporters = [
    { country: 'USA', share: 42 },
    { country: 'France', share: 11 },
    { country: 'Russia', share: 11 },
    { country: 'China', share: 5.8 },
    { country: 'Germany', share: 5.6 },
    { country: 'Italy', share: 4.6 },
    { country: 'UK', share: 4.2 },
    { country: 'S. Korea', share: 2.7 },
    { country: 'Israel', share: 2.4 },
    { country: 'Turkey', share: 1.2 },
  ];
  // Top importers
  const importers = [
    { country: 'India', share: 9.8 },
    { country: 'Saudi Arabia', share: 8.4 },
    { country: 'Qatar', share: 7.6 },
    { country: 'Ukraine', share: 4.9 },
    { country: 'Japan', share: 4.1 },
    { country: 'Egypt', share: 3.5 },
    { country: 'S. Korea', share: 3.5 },
    { country: 'Pakistan', share: 3.3 },
    { country: 'Australia', share: 2.9 },
    { country: 'Kuwait', share: 2.5 },
  ];

  return (
    <div className="px-3 pb-3">
      <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em] mb-2">Arms Trade (SIPRI)</h3>
      <div className="text-[10px] font-mono text-[#888] mb-1.5">Top Exporters 2019-2023</div>
      <div className="space-y-0.5 mb-2">
        {exporters.slice(0, 6).map(e => (
          <div key={`exp-${e.country}`} className="flex items-center gap-2">
            <span className="text-[10px] text-[#888] w-14 font-mono">{e.country}</span>
            <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#dc2626]" style={{ width: `${(e.share / 42) * 100}%`, opacity: 0.5 }} />
            </div>
            <span className="text-[10px] text-[#666] w-8 text-right font-mono">{e.share}%</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono text-[#888] mb-1.5">Top Importers 2019-2023</div>
      <div className="space-y-0.5">
        {importers.slice(0, 6).map(i => (
          <div key={`imp-${i.country}`} className="flex items-center gap-2">
            <span className="text-[10px] text-[#888] w-14 font-mono">{i.country}</span>
            <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${(i.share / 9.8) * 100}%`, opacity: 0.5 }} />
            </div>
            <span className="text-[10px] text-[#666] w-8 text-right font-mono">{i.share}%</span>
          </div>
        ))}
      </div>
      <div className="text-[9px] font-mono text-[#444] mt-1.5">Source: SIPRI 2024 (TIV market share %)</div>
    </div>
  );
}

function MilSpendingWidget() {
  const [data, setData] = useState<{ country: string; code: string; value: number }[]>([]);

  useEffect(() => {
    fetch('/api/economic')
      .then(r => r.json())
      .then(d => setData(d.milSpending || []))
      .catch(() => {});
  }, []);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value));

  return (
    <div className="px-3 pb-3">
      <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em] mb-2">Military Spending (% GDP)</h3>
      <div className="space-y-1">
        {data.slice(0, 10).map(d => (
          <div key={d.code} className="flex items-center gap-2">
            <span className="text-[10px] text-[#888] w-14 font-mono truncate">{d.country.split(',')[0].slice(0, 12)}</span>
            <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: d.value > 5 ? '#dc2626' : d.value > 3 ? '#f97316' : '#eab308', opacity: 0.5 }}
              />
            </div>
            <span className="text-[10px] text-[#666] w-10 text-right font-mono">{d.value}%</span>
          </div>
        ))}
      </div>
      <div className="text-[9px] font-mono text-[#444] mt-1.5">Source: World Bank 2022</div>
    </div>
  );
}
