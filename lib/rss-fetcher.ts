import RSSParser from 'rss-parser';
import { NewsItem, FeedConfig } from './types';
import { CONFLICT_KEYWORDS } from './config';
import { extractLocation } from './geo-extract';
import { generateId, extractKeywords } from './utils';

const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'OSINT-Monitor/2.0 (Argus)',
  },
});

// Per-host throttle: serialise same-domain fetches with a small gap so bursts (e.g. ~9 BBC feeds) avoid rate-limiting.
const hostQueue = new Map<string, Promise<unknown>>();
function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}
function throttleHost<T>(host: string, fn: () => Promise<T>, gap = 900): Promise<T> {
  const prev = hostQueue.get(host) || Promise.resolve();
  const run = prev.then(fn, fn);
  hostQueue.set(host, run.then(() => new Promise(r => setTimeout(r, gap)), () => new Promise(r => setTimeout(r, gap))));
  return run;
}

export async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  try {
    const result = await throttleHost(hostOf(feed.url), () => parser.parseURL(feed.url));
    const items: NewsItem[] = [];

    for (const item of result.items || []) {
      const title = item.title || '';
      const description = item.contentSnippet || item.content || '';
      const text = `${title} ${description}`.toLowerCase();

      // Filter: include items relevant to geopolitics, military, markets
      const isRelevant = CONFLICT_KEYWORDS.some(kw =>
        text.includes(kw.toLowerCase())
      );

      // Tier 1 + market/crypto/energy: include everything. Others: filter by keywords
      const alwaysInclude = (feed.tier === 1) || ['markets', 'crypto', 'energy', 'nuclear', 'cyber'].includes(feed.category);
      if (!isRelevant && !alwaysInclude) continue;

      const keywords = extractKeywords(text);
      // Sport (F1) is feed-only - exclude from the conflict map (race countries are not events)
      const location = feed.category === 'sport' ? null : extractLocation(text);

      items.push({
        id: generateId(item.link || title),
        title,
        description: description.slice(0, 300),
        link: item.link || '',
        source: feed.name,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        category: feed.category,
        keywords,
        location: location || undefined,
        imageUrl: item.enclosure?.url || undefined,
        sourceTier: feed.tier || 3,
        sourceReliability: feed.reliability || 50,
      });
    }

    return items;
  } catch (error) {
    console.error(`[RSS] Error fetching ${feed.name}:`, error);
    return [];
  }
}

export async function fetchAllFeeds(feeds: FeedConfig[]): Promise<NewsItem[]> {
  const enabledFeeds = feeds.filter(f => f.enabled);
  
  // Sort by tier: fetch tier 1 first for priority
  const sorted = [...enabledFeeds].sort((a, b) => (a.tier || 3) - (b.tier || 3));
  
  // Fetch in batches of 10 to avoid overwhelming
  const allItems: NewsItem[] = [];
  for (let i = 0; i < sorted.length; i += 10) {
    const batch = sorted.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(feed => fetchFeed(feed))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    }
  }

  // Sort by date, newest first
  allItems.sort((a, b) =>
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  // Deduplicate by title similarity
  const seen = new Set<string>();
  return allItems.filter(item => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
