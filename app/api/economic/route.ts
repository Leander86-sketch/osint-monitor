import { NextResponse } from 'next/server';

// Economic Warfare Indicators
// World Bank API (free, no key) + existing market data

interface MilSpending {
  country: string;
  code: string;
  value: number;
  year: number;
}

interface EconomicData {
  milSpending: MilSpending[];
  commodities: { name: string; price: string; change: string }[];
}

const CACHE_MS = 60 * 60_000; // 1 hour
let cache: { data: EconomicData | null; ts: number } = { data: null, ts: 0 };

const COUNTRIES = 'RUS;UKR;IRN;ISR;CHN;USA;SAU;IND;PAK;GBR;FRA;DEU;TUR;EGY;KOR';

async function fetchMilSpending(): Promise<MilSpending[]> {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${COUNTRIES}/indicator/MS.MIL.XPND.GD.ZS?format=json&per_page=50&date=2022`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return [];

    return (data[1] || [])
      .filter((e: Record<string, unknown>) => e.value != null)
      .map((e: Record<string, unknown>) => ({
        country: (e.country as Record<string, string>)?.value || '',
        code: (e.countryiso3code as string) || '',
        value: Math.round((e.value as number) * 100) / 100,
        year: parseInt(e.date as string) || 2022,
      }))
      .sort((a: MilSpending, b: MilSpending) => b.value - a.value);
  } catch {
    return [];
  }
}

async function fetchCommodities(): Promise<{ name: string; price: string; change: string }[]> {
  // Use existing market endpoint for crypto, add commodity context
  return [
    { name: 'Brent Crude', price: 'See market feed', change: '' },
    { name: 'Gold', price: 'See market feed', change: '' },
    { name: 'Wheat', price: 'See market feed', change: '' },
  ];
}

async function fetchEconomicData(): Promise<EconomicData> {
  if (cache.data && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  const [milSpending, commodities] = await Promise.all([
    fetchMilSpending(),
    fetchCommodities(),
  ]);

  const data: EconomicData = { milSpending, commodities };
  if (milSpending.length > 0) {
    cache = { data, ts: Date.now() };
  }
  return data;
}

export async function GET() {
  const data = await fetchEconomicData();
  return NextResponse.json(data);
}
