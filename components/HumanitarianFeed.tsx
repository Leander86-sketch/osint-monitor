'use client';

import { useEffect, useState, useCallback } from 'react';

interface ReliefWebReport {
  id: string;
  title: string;
  url: string;
  country: string;
  source: string;
  date: string;
  format: string;
  theme: string;
  severity?: 'emergency' | 'crisis' | 'alert' | 'info';
}

const SEVERITY_COLORS: Record<string, string> = {
  emergency: '#dc2626',
  crisis: '#f97316',
  alert: '#eab308',
  info: '#6b7280',
};

const SEVERITY_LABELS: Record<string, string> = {
  emergency: 'EMRG',
  crisis: 'CRIS',
  alert: 'ALRT',
  info: 'INFO',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

export default function HumanitarianFeed() {
  const [reports, setReports] = useState<ReliefWebReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reliefweb');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('ReliefWeb fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000); // 10 min
    return () => clearInterval(interval);
  }, [fetchData]);

  // Get unique countries for filter
  const countries = [...new Set(reports.map(r => (r.country || '').split(', ')[0]).filter(Boolean))].sort();
  const filtered = countryFilter
    ? reports.filter(r => (r.country || '').includes(countryFilter))
    : reports;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#666] text-[12px] font-mono">
        Loading humanitarian data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#888] uppercase tracking-wider">UN OCHA ReliefWeb</span>
          <span className="text-[11px] font-mono text-[#555]">{filtered.length}</span>
        </div>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="bg-[#111] text-[11px] font-mono text-[#aaa] border border-[#222] rounded px-1.5 py-0.5"
        >
          <option value="">All countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(report => {
          const sevColor = SEVERITY_COLORS[report.severity || 'info'];
          const sevLabel = SEVERITY_LABELS[report.severity || 'info'];
          return (
            <a
              key={report.id}
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2.5 border-b border-[#111] hover:bg-[#0d0d0d] transition-colors"
              style={{ borderLeft: `3px solid ${sevColor}` }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="text-[9px] font-mono font-bold px-1 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ color: sevColor, backgroundColor: `${sevColor}15`, border: `1px solid ${sevColor}30` }}
                >
                  {sevLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-[#ccc] font-mono leading-snug line-clamp-2">{report.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#666]">
                    {report.country && (
                      <>
                        <span className="text-[#888]">{report.country}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{report.source}</span>
                    <span>·</span>
                    <span>{timeAgo(report.date)}</span>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-[#555] text-[12px] font-mono py-8">No reports available</div>
        )}
      </div>
    </div>
  );
}
