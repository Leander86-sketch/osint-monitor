'use client';

import { useEffect, useState, useCallback } from 'react';

interface ArmsExporter {
  country: string;
  totalTIV: number;
  share: number;
  topClients: string[];
}

interface ArmsTransfer {
  exporter: string;
  importer: string;
  value: number;
  period: string;
}

export default function ArmsPanel() {
  const [exporters, setExporters] = useState<ArmsExporter[]>([]);
  const [flows, setFlows] = useState<ArmsTransfer[]>([]);
  const [view, setView] = useState<'exporters' | 'flows'>('exporters');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/arms');
      const data = await res.json();
      setExporters(data.exporters || []);
      setFlows(data.flows || []);
    } catch (err) {
      console.error('Arms data fetch failed:', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxTIV = exporters.length > 0 ? exporters[0].totalTIV : 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[11px] font-mono text-[#888] uppercase tracking-wider">SIPRI Arms Trade 2019-2023</span>
        <div className="flex gap-1">
          <button
            onClick={() => setView('exporters')}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${view === 'exporters' ? 'bg-[#1a1a1a] text-[#e8760a]' : 'text-[#666]'}`}
          >TOP 10</button>
          <button
            onClick={() => setView('flows')}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${view === 'flows' ? 'bg-[#1a1a1a] text-[#e8760a]' : 'text-[#666]'}`}
          >FLOWS</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'exporters' ? (
          <div className="p-3 space-y-2">
            {exporters.map((e, i) => (
              <div key={e.country} className="border border-[#1a1a1a] rounded bg-[#0a0a0a] p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-mono font-bold text-[#ccc]">
                    {i + 1}. {e.country}
                  </span>
                  <span className="text-[11px] font-mono text-[#e8760a]">{e.share}%</span>
                </div>
                <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-[#e8760a]"
                    style={{ width: `${(e.totalTIV / maxTIV) * 100}%`, opacity: 0.5 }}
                  />
                </div>
                <div className="text-[10px] font-mono text-[#666]">
                  TIV: ${(e.totalTIV / 1000).toFixed(1)}B · Clients: {e.topClients.slice(0, 3).join(', ')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {flows.map((f, i) => (
              <div key={`${f.exporter}-${f.importer}`} className="flex items-center gap-2 px-2 py-1.5 border-b border-[#111]">
                <span className="text-[11px] font-mono text-[#aaa] w-16 shrink-0">{f.exporter}</span>
                <span className="text-[11px] text-[#555]">→</span>
                <span className="text-[11px] font-mono text-[#ccc] w-20 shrink-0">{f.importer}</span>
                <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#dc2626]"
                    style={{ width: `${(f.value / 8200) * 100}%`, opacity: 0.5 }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#666] w-12 text-right">${(f.value / 1000).toFixed(1)}B</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-[#1a1a1a]">
        <div className="text-[9px] font-mono text-[#444]">Source: SIPRI Arms Transfers Database · TIV = Trend Indicator Value</div>
      </div>
    </div>
  );
}
