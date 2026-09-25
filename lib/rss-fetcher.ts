import RSSParser from 'rss-parser';
import { NewsItem, FeedConfig } from './types';
import { extractLocation } from './geo-extract';
import { generateId, extractKeywords } from './utils';

const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
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

// Datum-normalisatie (25 sep 2026): IAEA (iaea.org/feeds/topnews) levert " 26-09-25 08:00 " (JJ-MM-DD UU:MM, Weense tijd);
// dat parste als een vreemde datum en sorteerde fout. Onparseerbaar → nu.
function normalizeDate(raw?: string): string {
  const s = (raw || '').trim();
  if (!s) return new Date().toISOString();
  const m = /^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(s);
  if (m) return `20${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+02:00`;
  return isNaN(new Date(s).getTime()) ? new Date().toISOString() : s;
}

export async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  try {
    // WordPress-JSON (22 sep 2026): ISW heeft geen RSS meer, wel /wp-json/wp/v2/posts — dezelfde vorm als een feed
    const result = /\/wp-json\/wp\/v2\/posts/.test(feed.url)
      ? await throttleHost(hostOf(feed.url), async () => {
          const r = await fetch(feed.url, { headers: { 'User-Agent': 'ARGUS-dashboard/1.0 (+https://argus.prototipo.nl)' }, signal: AbortSignal.timeout(20000) });
          const posts = (await r.json()) as Array<{ title?: { rendered?: string }; link?: string; date?: string; excerpt?: { rendered?: string } }>;
          return { items: posts.map(p => ({ content: undefined as string | undefined, isoDate: undefined as string | undefined, enclosure: undefined as { url?: string } | undefined, title: (p.title?.rendered || '').replace(/&#8217;|&#039;/g, "'").replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''), link: p.link || '', pubDate: p.date ? new Date(p.date).toUTCString() : undefined, contentSnippet: (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').slice(0, 300) })) };
        })
      : await throttleHost(hostOf(feed.url), () => parser.parseURL(feed.url));
    const items: NewsItem[] = [];

    for (const item of result.items || []) {
      const title = item.title || '';
      const description = item.contentSnippet || item.content || '';
      const text = `${title} ${description}`.toLowerCase();

      // Filter: include items relevant to geopolitics, military, markets (word-boundary match)
      const keywords = extractKeywords(text);
      const isRelevant = keywords.length > 0;

      // Tier 1 + market/crypto/energy: include everything. Others: filter by keywords
      const alwaysInclude = (feed.tier === 1) || ['markets', 'crypto', 'energy', 'nuclear', 'cyber'].includes(feed.category);
      if (!isRelevant && !alwaysInclude) continue;

      // Sport (F1) is feed-only - exclude from the conflict map (race countries are not events)
      const location = feed.category === 'sport' ? null : extractLocation(`${title} ${description}`); // originele hoofdletters: de registerlaag heeft ze nodig

      items.push({
        id: generateId(item.link || title),
        title,
        description: description.slice(0, 300),
        link: item.link || '',
        source: feed.name,
        pubDate: normalizeDate(item.pubDate || item.isoDate),
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
