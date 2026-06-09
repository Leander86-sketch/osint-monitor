'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertEvent } from '@/lib/types';

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentEvents, setRecentEvents] = useState<AlertEvent[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
      setRecentEvents(data.recentEvents || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const addAlert = async () => {
    if (!newKeyword.trim()) return;
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', keyword: newKeyword.trim() }),
    });
    setNewKeyword('');
    fetchAlerts();
  };

  const toggleAlert = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    fetchAlerts();
  };

  const removeAlert = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', id }),
    });
    fetchAlerts();
  };

  const resetAlerts = async () => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    fetchAlerts();
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(diff / 86400000)}d`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-[11px] font-mono font-bold text-[#ddd]2 uppercase tracking-[0.2em]">Alert Configuration</h2>
          <button
            onClick={resetAlerts}
            className="text-[12px] font-mono text-[#ccc] hover:text-[#e8760a] transition-colors uppercase tracking-wider"
            title="Reset to defaults"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Add Alert */}
      <div className="flex gap-2 px-4 py-2.5 border-b border-[#111]">
        <input
          type="text"
          placeholder="Add watchword..."
          value={newKeyword}
          onChange={e => setNewKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addAlert()}
          className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2.5 py-1.5 text-[13px] text-[#ccc] font-mono placeholder:text-[#222] focus:outline-none focus:border-[#e8760a]/30"
        />
        <button
          onClick={addAlert}
          className="px-3 py-1.5 rounded border border-[#1a1a1a] text-[#e8760a] text-sm font-mono hover:bg-[#e8760a]/5 hover:border-[#e8760a]/30 transition-colors"
        >
          +
        </button>
      </div>

      {/* Alert Keywords — click to filter */}
      <div className="px-4 py-2.5 border-b border-[#111]">
        <div className="flex flex-wrap gap-1.5">
          {alerts.map(alert => {
            const isFiltered = activeFilter === alert.keyword;
            return (
              <div
                key={alert.id}
                className={`group flex items-center gap-1.5 text-[11px] px-2 py-1 rounded font-mono transition-all border cursor-pointer ${
                  isFiltered
                    ? 'border-[#e8760a]/60 text-[#e8760a] bg-[#e8760a]/15 shadow-[0_0_8px_rgba(232,118,10,0.2)]'
                    : alert.enabled
                      ? 'border-[#e8760a]/20 text-[#e8760a] bg-[#e8760a]/5 hover:bg-[#e8760a]/10'
                      : 'border-[#1a1a1a] text-[#ccc]'
                }`}
                onClick={() => setActiveFilter(prev => prev === alert.keyword ? null : alert.keyword)}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleAlert(alert.id); }}
                  className="hover:opacity-70"
                >
                  {alert.enabled ? '◉' : '○'}
                </button>
                <span className="uppercase tracking-wider">{alert.keyword}</span>
                {(() => {
                  const count = recentEvents.filter(e => e.keyword.toLowerCase() === alert.keyword.toLowerCase()).length;
                  return count > 0 ? <span className="opacity-40">({count})</span> : null;
                })()}
                <button
                  onClick={e => { e.stopPropagation(); removeAlert(alert.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-[#dc2626] transition-opacity ml-1"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {activeFilter && (
          <button
            onClick={() => setActiveFilter(null)}
            className="mt-2 text-[12px] font-mono text-[#e8760a]/50 hover:text-[#e8760a] transition-colors uppercase tracking-wider"
          >
            Show all
          </button>
        )}
      </div>

      {/* Recent Alert Events */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex items-center justify-between">
          <h3 className="text-[12px] font-mono text-[#ccc] uppercase tracking-[0.15em]">
            {activeFilter ? `Triggers — ${activeFilter.toUpperCase()}` : 'Recent Triggers'}
          </h3>
          {activeFilter && (
            <span className="text-[12px] font-mono text-[#e8760a]/40">
              {recentEvents.filter(e => e.keyword.toLowerCase() === activeFilter.toLowerCase()).length} hits
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border border-[#e8760a]/30 border-t-[#e8760a] rounded-full animate-spin" />
          </div>
        ) : (activeFilter ? recentEvents.filter(e => e.keyword.toLowerCase() === activeFilter.toLowerCase()) : recentEvents).length === 0 ? (
          <div className="text-center py-8 text-[#1a1a1a] text-[11px] font-mono uppercase">
            No triggers recorded
          </div>
        ) : (
          <div className="divide-y divide-[#0e0e0e]">
            {(activeFilter ? recentEvents.filter(e => e.keyword.toLowerCase() === activeFilter.toLowerCase()) : recentEvents).map(event => (
              <a
                key={event.id}
                href={event.newsItem.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 hover:bg-[#0c0c0c] transition-colors"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] px-1.5 py-0.5 rounded border border-[#e8760a]/20 text-[#e8760a] font-mono uppercase tracking-wider">
                    {event.keyword}
                  </span>
                  <span className="text-[12px] text-[#ccc] font-mono">{timeAgo(event.triggeredAt)}</span>
                </div>
                <p className="text-[12px] text-[#ddd]2 line-clamp-1 font-mono">{event.newsItem.title}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
