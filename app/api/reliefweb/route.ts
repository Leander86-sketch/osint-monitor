import { NextResponse } from 'next/server';

// Humanitarian RSS feeds — multiple UN/aid sources
// Free, no API key needed

interface HumanitarianReport {
  id: string;
  title: string;
  url: string;
  description: string;
  source: string;
  date: string;
  severity: 'emergency' | 'crisis' | 'alert' | 'info';
}

const CACHE_MS = 10 * 60_000; // 10 minutes
let cache: { data: HumanitarianReport[]; ts: number } = { data: [], ts: 0 };

const FEEDS = [
  { url: 'https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml', source: 'UN News' },
  { url: 'https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml', source: 'UN Security' },
  { url: 'https://www.icrc.org/en/rss', source: 'ICRC' },
  { url: 'https://www.unhcr.org/rss/news.xml', source: 'UNHCR' },
  { url: 'https://www.wfp.org/rss.xml', source: 'WFP' },
];

function classifySeverity(title: string): 'emergency' | 'crisis' | 'alert' | 'info' {
  const lower = title.toLowerCase();
  if (lower.includes('emergency') || lower.includes('death') || lower.includes('massacre') || lower.includes('catastroph') || lower.includes('famine')) return 'emergency';
  if (lower.includes('crisis') || lower.includes('conflict') || lower.includes('displacement') || lower.includes('cholera') || lower.includes('flood') || lower.includes('attack')) return 'crisis';
  if (lower.includes('update') || lower.includes('situation') || lower.includes('response') || lower.includes('appeal') || lower.includes('warning')) return 'alert';
  return 'info';
}

function decodeEntities(str: string): string {
  return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').trim();
}

async function fetchFeed(feed: typeof FEEDS[0]): Promise<HumanitarianReport[]> {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();

    const reports: HumanitarianReport[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && reports.length < 15) {
      const block = match[1];
      const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
      const linkMatch = block.match(/<link>([^<]+)<\/link>/);
      const dateMatch = block.match(/<pubDate>([^<]+)<\/pubDate>/);
      const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

      if (!titleMatch) continue;
      const title = decodeEntities(titleMatch[1]);
      const url = linkMatch?.[1]?.trim() || '';
      const date = dateMatch?.[1]?.trim() || new Date().toISOString();
      const description = descMatch ? decodeEntities(descMatch[1]).slice(0, 200) : '';

      reports.push({
        id: `hum-${feed.source.replace(/\s/g, '')}-${reports.length}`,
        title,
        url,
        description,
        source: feed.source,
        date,
        severity: classifySeverity(title),
      });
    }
    return reports;
  } catch {
    return [];
  }
}

async function fetchAll(): Promise<HumanitarianReport[]> {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }

  const results = await Promise.all(FEEDS.map(fetchFeed));
  const allReports = results.flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  if (allReports.length > 0) {
    cache = { data: allReports, ts: Date.now() };
  }
  return allReports;
}

export async function GET() {
  const reports = await fetchAll();
  return NextResponse.json({
    reports,
    count: reports.length,
  });
}
