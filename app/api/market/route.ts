import { NextResponse } from 'next/server';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  type: 'crypto' | 'index';
}

let cache: { items: MarketItem[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchCryptoData(): Promise<MarketItem[]> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h',
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      type: 'crypto' as const,
    }));
  } catch { return []; }
}

async function fetchGlobalMarket(): Promise<MarketItem[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const g = data.data;
    return [{
      symbol: 'MCAP',
      name: 'Total Crypto',
      price: Math.round((g.total_market_cap?.eur || 0) / 1e9),
      change24h: g.market_cap_change_percentage_24h_usd || 0,
      type: 'index' as const,
    }];
  } catch { return []; }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ items: cache.items, cached: true });
    }
    const [crypto, global] = await Promise.all([fetchCryptoData(), fetchGlobalMarket()]);
    const items = [...global, ...crypto];
    cache = { items, fetchedAt: Date.now() };
    return NextResponse.json({ items, cached: false });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
