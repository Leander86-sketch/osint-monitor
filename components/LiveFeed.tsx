'use client';

import { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '@/lib/types';
import { CONFLICT_KEYWORDS } from '@/lib/config';

interface LiveFeedProps {
  onRefresh?: () => void;
  keywordFilter?: string;
  onClearFilter?: () => void;
}

const TIER_BADGE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'T1', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  2: { label: 'T2', color: '#e8760a', bg: 'rgba(232,118,10,0.1)' },
  3: { label: 'T3', color: '#555', bg: 'rgba(85,85,85,0.1)' },
};

function highlightKeywords(text: string): React.ReactNode {
  const shortList = CONFLICT_KEYWORDS.slice(0, 60);
  const regex = new RegExp(`\\b(${shortList.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (shortList.some(kw => kw.toLowerCase() === part.toLowerCase())) {
      return <span key={i} className="text-[#e8760a]">{part}</span>;
    }
    return part;
  });
}

function getConfidence(item: NewsItem): { label: string; color: string } {
  // Use reliability score if available
  if (item.sourceReliability) {
    if (item.sourceReliability >= 85) return { label: 'HI', color: 'text-[#16a34a]' };
    if (item.sourceReliability >= 65) return { label: 'MD', color: 'text-[#e8760a]' };
    return { label: 'LO', color: 'text-[#ddd]2' };
  }
  const majorSources = ['Reuters', 'BBC', 'AP News', 'Al Jazeera', 'Bloomberg'];
  const isMajor = majorSources.some(s => item.source.includes(s));
  const hasKw = item.keywords.length >= 3;
  if (isMajor && hasKw) return { label: 'HI', color: 'text-[#16a34a]' };
  if (isMajor || hasKw) return { label: 'MD', color: 'text-[#e8760a]' };
  return { label: 'LO', color: 'text-[#ddd]2' };
}

function getSeverityBorder(item: NewsItem): string {
  const text = `${item.title} ${item.description}`.toLowerCase();
  if (['massacre', 'nuclear', 'invasion', 'war declared'].some(k => text.includes(k))) return 'border-l-[#dc2626]';
  if (['airstrike', 'bombing', 'missile', 'killed', 'hostage'].some(k => text.includes(k))) return 'border-l-[#c47030]';
  if (['ceasefire', 'sanctions', 'clash', 'protest'].some(k => text.includes(k))) return 'border-l-[#e8760a]';
  return 'border-l-[#1a1a1a]';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'NOW';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

export default function LiveFeed({ onRefresh, keywordFilter, onClearFilter }: LiveFeedProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [tierFilter, setTierFilter] = useState(0); // 0 = all

  useEffect(() => {
    if (keywordFilter !== undefined) {
      setFilter(keywordFilter);
    }
  }, [keywordFilter]);

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (sourceFilter) params.set('source', sourceFilter);
      if (filter) params.set('keyword', filter);
      const res = await fetch(`/api/feed?${params}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sourceFilter]);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/feed', { method: 'POST' });
      await fetchItems();
      onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  useEffect(() => {
    doRefresh();
    const interval = setInterval(doRefresh, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sources = [...new Set(items.map(i => i.source))];
  const filteredItems = tierFilter > 0 ? items.filter(i => (i.sourceTier || 3) === tierFilter) : items;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-[#e8760a] animate-pulse' : 'bg-[#16a34a]'}`} />
          <h2 className="text-[11px] font-mono font-bold text-[#ddd]2 uppercase tracking-[0.2em]">Intel Feed</h2>
          <span className="text-[11px] text-[#ccc] font-mono">{filteredItems.length}</span>
        </div>
        <button
          onClick={doRefresh}
          disabled={refreshing}
          className="text-[11px] px-2.5 py-1 font-mono uppercase tracking-wider border border-[#1a1a1a] rounded text-[#ddd] hover:text-[#e8760a] hover:border-[#e8760a]/30 transition-colors disabled:opacity-30"
        >
          {refreshing ? '...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 border-b border-[#111]">
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2.5 py-1.5 text-[13px] text-[#ccc] font-mono placeholder:text-[#222] focus:outline-none focus:border-[#e8760a]/30"
        />
        {keywordFilter && (
          <button
            onClick={onClearFilter}
            className="px-2 py-1.5 text-[11px] font-mono text-[#e8760a] border border-[#e8760a]/30 rounded hover:bg-[#e8760a]/10 transition-colors uppercase tracking-wider whitespace-nowrap"
          >
            Clear
          </button>
        )}
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1.5 text-[12px] text-[#ddd]2 font-mono focus:outline-none focus:border-[#e8760a]/30"
        >
          <option value="">ALL SRC</option>
          {sources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tier Filter Bar */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#0d0d0d]">
        <span className="text-[12px] text-[#ccc] font-mono mr-1 uppercase">Tier:</span>
        {[
          { val: 0, label: 'All' },
          { val: 1, label: 'T1 Wire/Major' },
          { val: 2, label: 'T2 Regional' },
          { val: 3, label: 'T3 Niche' },
        ].map(t => (
          <button
            key={t.val}
            onClick={() => setTierFilter(t.val)}
            className={`text-[12px] px-2 py-0.5 font-mono rounded transition-colors ${
              tierFilter === t.val
                ? 'bg-[#1a1a1a] text-[#e8760a]'
                : 'text-[#ccc] hover:text-[#ddd]2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-4 h-4 border border-[#e8760a]/30 border-t-[#e8760a] rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-[#222] text-[12px] font-mono uppercase">
            No intel available
          </div>
        ) : (
          <div className="divide-y divide-[#0e0e0e]">
            {filteredItems.map(item => {
              const conf = getConfidence(item);
              const severityBorder = getSeverityBorder(item);
              const tier = TIER_BADGE[item.sourceTier || 3] || TIER_BADGE[3];
              return (
                <a
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block px-4 py-2.5 hover:bg-[#0c0c0c] transition-colors border-l-2 ${severityBorder}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Tier badge */}
                        <span
                          className="text-[7px] px-1 py-0.5 rounded font-mono font-bold"
                          style={{ color: tier.color, backgroundColor: tier.bg }}
                        >
                          {tier.label}
                        </span>
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#ddd]">
                          {item.source.length > 16 ? item.source.split(' ').slice(0, 2).join(' ') : item.source}
                        </span>
                        <span className={`text-[12px] font-mono font-bold ${conf.color}`}>
                          [{conf.label}]
                        </span>
                        <span className="text-[12px] text-[#ccc] font-mono">{timeAgo(item.pubDate)}</span>
                        {item.location && (
                          <span className="text-[12px] text-[#ddd] font-mono ml-auto truncate max-w-[80px]">{item.location.name}</span>
                        )}
                      </div>
                      <h3 className="text-[13px] text-[#ccc] leading-snug">
                        {highlightKeywords(item.title)}
                      </h3>
                      {item.description && (
                        <p className="text-[12px] text-[#ccc] mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.keywords.slice(0, 4).map(kw => (
                            <span key={kw} className="text-[12px] px-1 py-0.5 rounded border border-[#1a1a1a] text-[#ccc] font-mono">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
