'use client';

import { useState, useEffect, useCallback } from 'react';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  type: 'crypto' | 'index';
}

function formatPrice(price: number, type: string): string {
  if (type === 'index') return `€${price}B`;
  if (price >= 1000) return `€${price.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `€${price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `€${price.toFixed(4)}`;
}

export default function MarketTicker() {
  const [items, setItems] = useState<MarketItem[]>([]);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items) setItems(data.items);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  if (items.length === 0) return null;

  // Triple items so the loop is seamless even on wide screens
  const tripled = [...items, ...items, ...items];

  const renderItem = (item: MarketItem, i: number) => {
    const isUp = item.change24h >= 0;
    return (
      <div
        key={`${item.symbol}-${i}`}
        className="inline-flex items-center gap-1.5 px-4 flex-shrink-0"
      >
        <span className="text-[11px] font-mono font-bold text-[#e8760a]/70 uppercase tracking-wider">
          {item.symbol}
        </span>
        <span className="text-[11px] text-[#ddd]2 font-mono">
          {formatPrice(item.price, item.type)}
        </span>
        <span className={`text-[11px] font-mono font-bold ${
          isUp ? 'text-[#16a34a]' : 'text-[#dc2626]'
        }`}>
          {isUp ? '+' : ''}{item.change24h.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="ticker-wrapper border-b border-[#1a1a1a] bg-[#060606]">
      <div className="animate-ticker whitespace-nowrap py-1.5">
        {tripled.map((item, i) => renderItem(item, i))}
      </div>
    </div>
  );
}
