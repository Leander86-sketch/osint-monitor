'use client';

import { useEffect, useState, useCallback } from 'react';

interface SanctionRegime {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  adoptedBy: string;
  lastAmended: string;
  hasLists: boolean;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '?';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default function SanctionsFeed() {
  const [regimes, setRegimes] = useState<SanctionRegime[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sanctions');
      const data = await res.json();
      setRegimes(data.regimes || []);
    } catch (err) {
      console.error('Sanctions fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = search
    ? regimes.filter(r =>
        r.country.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase())
      )
    : regimes;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-[12px] font-mono">
        Loading sanctions data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-[#888] uppercase tracking-wider">EU/UN Sanctions</span>
          <span className="text-[11px] font-mono text-[#555]">{filtered.length} regimes</span>
        </div>
        <input
          type="text"
          placeholder="Search country or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111] text-[11px] font-mono text-[#ccc] border border-[#222] rounded px-2 py-1 placeholder-[#444] focus:border-[#e8760a]/30 focus:outline-none"
        />
      </div>

      {/* Regime List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(regime => {
          const isRecent = regime.lastAmended && (Date.now() - new Date(regime.lastAmended).getTime()) < 90 * 86400000;
          return (
            <div
              key={regime.id}
              className="px-3 py-2.5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors"
              style={{ borderLeft: `3px solid ${isRecent ? '#e8760a' : '#333'}` }}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[12px] font-mono font-bold text-[#ccc]">{regime.country}</span>
                    <span
                      className="text-[9px] font-mono px-1 py-0.5 rounded"
                      style={{
                        color: regime.adoptedBy === 'UN' ? '#3b82f6' : '#eab308',
                        backgroundColor: regime.adoptedBy === 'UN' ? '#3b82f620' : '#eab30820',
                        border: `1px solid ${regime.adoptedBy === 'UN' ? '#3b82f630' : '#eab30830'}`,
                      }}
                    >
                      {regime.adoptedBy}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#888] font-mono line-clamp-2 leading-snug">{regime.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#555]">
                    <span>Amended: {timeAgo(regime.lastAmended)}</span>
                    {regime.hasLists && <span>· Entity lists</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-[#555] text-[12px] font-mono py-8">No matching sanctions found</div>
        )}
      </div>
    </div>
  );
}
