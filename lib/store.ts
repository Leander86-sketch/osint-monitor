import { NewsItem, Alert, AlertEvent, GeoEvent, DashboardStats } from './types';
import { newsItemToGeoEvent } from './utils';
import { fetchAllFeeds } from './rss-fetcher';
import { RSS_FEEDS } from './config';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
const ALERT_EVENTS_FILE = path.join(DATA_DIR, 'alert-events.json');

// Global singleton to survive Next.js hot reloads & module re-instantiation
interface GlobalStore {
  newsItems: NewsItem[];
  lastFetch: number;
}

const g = globalThis as unknown as { __osintStore?: GlobalStore };
if (!g.__osintStore) {
  g.__osintStore = { newsItems: [], lastFetch: 0 };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --- News Items ---

export function getNewsItems(limit = 100, offset = 0): NewsItem[] {
  return g.__osintStore!.newsItems.slice(offset, offset + limit);
}

export function getNewsItemCount(): number {
  return g.__osintStore!.newsItems.length;
}

export async function refreshFeeds(): Promise<{ added: number; total: number }> {
  const s = g.__osintStore!;
  const newItems = await fetchAllFeeds(RSS_FEEDS);
  const existingIds = new Set(s.newsItems.map(i => i.id));
  let added = 0;

  for (const item of newItems) {
    if (!existingIds.has(item.id)) {
      s.newsItems.unshift(item);
      existingIds.add(item.id);
      added++;
    }
  }

  // Sort by date, newest first
  s.newsItems.sort((a, b) =>
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  // Keep max 1000 items
  if (s.newsItems.length > 1000) {
    s.newsItems = s.newsItems.slice(0, 1000);
  }

  s.lastFetch = Date.now();

  // Check alerts for new items
  if (added > 0) {
    const alerts = getAlerts().filter(a => a.enabled);
    const newNewsItems = s.newsItems.slice(0, added);
    for (const item of newNewsItems) {
      checkAlerts(item, alerts);
    }
  }

  return { added, total: s.newsItems.length };
}

export function getLastFetchTime(): number {
  return g.__osintStore!.lastFetch;
}

let _refreshPromise: Promise<void> | null = null;

export async function ensureFeedsLoaded(): Promise<void> {
  const s = g.__osintStore!;
  if (s.newsItems.length > 0) return;
  // Deduplicate concurrent calls
  if (!_refreshPromise) {
    _refreshPromise = refreshFeeds().then(() => { _refreshPromise = null; });
  }
  await _refreshPromise;
}

// --- Geo Events ---

export function getGeoEvents(): GeoEvent[] {
  const events = g.__osintStore!.newsItems
    .map(newsItemToGeoEvent)
    .filter((e): e is GeoEvent => e !== null);

  // Apply jitter to events at the same location so they don't stack
  const locationCount = new Map<string, number>();
  for (const e of events) {
    const key = `${e.location.lat.toFixed(2)},${e.location.lng.toFixed(2)}`;
    const count = locationCount.get(key) || 0;
    if (count > 0) {
      // Spread in a spiral pattern around the original point
      const angle = (count * 137.5) * (Math.PI / 180); // golden angle
      const dist = 0.15 + count * 0.08; // degrees offset, grows with count
      e.location = {
        ...e.location,
        lat: e.location.lat + Math.cos(angle) * dist,
        lng: e.location.lng + Math.sin(angle) * dist,
      };
    }
    locationCount.set(key, count + 1);
  }

  return events;
}

// --- Alerts ---

export function getAlerts(): Alert[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  // Empty or missing → restore defaults and persist
  const defaults = getDefaultAlerts();
  saveAlerts(defaults);
  return defaults;
}

function getDefaultAlerts(): Alert[] {
  return [
    // Conflict
    { id: 'default-ceasefire', keyword: 'ceasefire', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-airstrike', keyword: 'airstrike', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-missile', keyword: 'missile', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-nuclear', keyword: 'nuclear', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    // Regions
    { id: 'default-ukraine', keyword: 'Ukraine', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-gaza', keyword: 'Gaza', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-iran', keyword: 'Iran', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-taiwan', keyword: 'Taiwan', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    // Markets
    { id: 'default-sanctions', keyword: 'sanctions', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    { id: 'default-tariff', keyword: 'tariff', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
    // Cyber
    { id: 'default-cyberattack', keyword: 'cyberattack', enabled: true, createdAt: new Date().toISOString(), triggerCount: 0 },
  ];
}

export function saveAlerts(alerts: Alert[]) {
  ensureDataDir();
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

export function resetAlerts(): Alert[] {
  const defaults = getDefaultAlerts();
  saveAlerts(defaults);
  return defaults;
}

export function addAlert(keyword: string): Alert {
  const alerts = getAlerts();
  const alert: Alert = {
    id: `alert-${Date.now().toString(36)}`,
    keyword,
    enabled: true,
    createdAt: new Date().toISOString(),
    triggerCount: 0,
  };
  alerts.push(alert);
  saveAlerts(alerts);
  return alert;
}

export function removeAlert(id: string) {
  const alerts = getAlerts().filter(a => a.id !== id);
  saveAlerts(alerts);
}

export function toggleAlert(id: string): Alert | null {
  const alerts = getAlerts();
  const alert = alerts.find(a => a.id === id);
  if (!alert) return null;
  alert.enabled = !alert.enabled;
  saveAlerts(alerts);
  return alert;
}

// --- Alert Events ---

function getAlertEvents(): AlertEvent[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ALERT_EVENTS_FILE)) {
      return JSON.parse(fs.readFileSync(ALERT_EVENTS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveAlertEvents(events: AlertEvent[]) {
  ensureDataDir();
  const trimmed = events.slice(0, 200);
  fs.writeFileSync(ALERT_EVENTS_FILE, JSON.stringify(trimmed, null, 2));
}

function checkAlerts(item: NewsItem, alerts: Alert[]) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const events = getAlertEvents();

  // Dedup: by article ID + keyword, AND by title similarity + keyword
  const seen = new Set(events.map(e => `${e.newsItem.id}::${e.alertId}`));
  const seenTitles = new Set(events.map(e => `${e.newsItem.title.slice(0, 60).toLowerCase()}::${e.keyword.toLowerCase()}`));

  let changed = false;
  for (const alert of alerts) {
    const dedupKey = `${item.id}::${alert.id}`;
    const titleKey = `${item.title.slice(0, 60).toLowerCase()}::${alert.keyword.toLowerCase()}`;
    if (seen.has(dedupKey) || seenTitles.has(titleKey)) continue; // already triggered

    if (text.includes(alert.keyword.toLowerCase())) {
      const event: AlertEvent = {
        id: `ae-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        alertId: alert.id,
        keyword: alert.keyword,
        newsItem: item,
        triggeredAt: new Date().toISOString(),
        notified: false,
      };
      events.unshift(event);
      seen.add(dedupKey);
      seenTitles.add(titleKey);
      changed = true;

      const allAlerts = getAlerts();
      const a = allAlerts.find(x => x.id === alert.id);
      if (a) {
        a.triggerCount++;
        a.lastTriggered = new Date().toISOString();
        saveAlerts(allAlerts);
      }
    }
  }

  if (changed) saveAlertEvents(events);
}

export function getRecentAlertEvents(limit = 50): AlertEvent[] {
  return getAlertEvents().slice(0, limit);
}

// --- Dashboard Stats ---

export function getDashboardStats(): DashboardStats {
  const s = g.__osintStore!;
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;

  // Filter out items with fake dates (many items sharing same second = batch-assigned)
  const dateCounts = new Map<number, number>();
  for (const item of s.newsItems) {
    const sec = Math.floor(new Date(item.pubDate).getTime() / 1000);
    dateCounts.set(sec, (dateCounts.get(sec) || 0) + 1);
  }
  const realDateItems = s.newsItems.filter(i => {
    const sec = Math.floor(new Date(i.pubDate).getTime() / 1000);
    return (dateCounts.get(sec) || 0) <= 3; // 3+ items on same second = fake
  });

  const articlesLastHour = realDateItems.filter(i =>
    new Date(i.pubDate).getTime() > oneHourAgo
  ).length;

  const articlesLast24h = realDateItems.filter(i =>
    new Date(i.pubDate).getTime() > oneDayAgo
  ).length;

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
  for (const item of s.newsItems.slice(0, 200)) {
    const sent = item.sentiment || 'neutral';
    sentimentBreakdown[sent]++;
  }

  // Top sources
  const sourceCounts = new Map<string, number>();
  for (const item of s.newsItems) {
    sourceCounts.set(item.source, (sourceCounts.get(item.source) || 0) + 1);
  }
  const topSources = Array.from(sourceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Top keywords
  const keywordCounts = new Map<string, number>();
  for (const item of s.newsItems.slice(0, 200)) {
    for (const kw of item.keywords) {
      keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
    }
  }
  const topKeywords = Array.from(keywordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Trend data (last 24h by hour)
  const trendData: { hour: string; count: number; sentiment: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = now - (i + 1) * 3600000;
    const hourEnd = now - i * 3600000;
    const hourItems = s.newsItems.filter(item => {
      const t = new Date(item.pubDate).getTime();
      return t >= hourStart && t < hourEnd;
    });
    const hour = new Date(hourEnd).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
    trendData.push({
      hour,
      count: hourItems.length,
      sentiment: 0,
    });
  }

  return {
    totalArticles: s.newsItems.length,
    articlesLastHour,
    articlesLast24h,
    sentimentBreakdown,
    topSources,
    topKeywords,
    trendData,
  };
}

// --- Ingest (from n8n webhook) ---

export function ingestItem(item: Partial<NewsItem>): NewsItem | null {
  if (!item.title || !item.link) return null;

  const newsItem: NewsItem = {
    id: item.id || `ingest-${Date.now().toString(36)}`,
    title: item.title,
    description: item.description || '',
    link: item.link,
    source: item.source || 'External',
    pubDate: item.pubDate || new Date().toISOString(),
    keywords: item.keywords || [],
    location: item.location,
    sentiment: item.sentiment,
  };

  g.__osintStore!.newsItems.unshift(newsItem);
  g.__osintStore!.lastFetch = Date.now();
  return newsItem;
}
