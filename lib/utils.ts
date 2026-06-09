import { CONFLICT_KEYWORDS, SEVERITY_KEYWORDS } from './config';
import { GeoEvent, NewsItem } from './types';
import { extractLocation } from './geo-extract';

export function generateId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36).slice(-4);
}

export function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return CONFLICT_KEYWORDS.filter(kw =>
    lower.includes(kw.toLowerCase())
  );
}

export function determineSeverity(text: string): 'low' | 'medium' | 'high' | 'critical' {
  const lower = text.toLowerCase();
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return severity as 'low' | 'medium' | 'high' | 'critical';
    }
  }
  return 'low';
}

export function determineEventType(text: string): 'military' | 'diplomatic' | 'humanitarian' | 'protest' | 'other' {
  const lower = text.toLowerCase();
  const militaryTerms = ['airstrike', 'bombing', 'missile', 'rocket', 'military', 'troops', 'operation', 'killed', 'strike', 'drone', 'tank', 'artillery'];
  const diplomaticTerms = ['talks', 'negotiation', 'diplomat', 'summit', 'agreement', 'treaty', 'UN', 'sanctions', 'ambassador'];
  const humanitarianTerms = ['aid', 'humanitarian', 'refugee', 'displaced', 'hunger', 'famine', 'UNRWA', 'medical', 'hospital', 'civilian'];
  const protestTerms = ['protest', 'demonstration', 'rally', 'march', 'activist'];

  if (militaryTerms.some(t => lower.includes(t))) return 'military';
  if (diplomaticTerms.some(t => lower.includes(t))) return 'diplomatic';
  if (humanitarianTerms.some(t => lower.includes(t))) return 'humanitarian';
  if (protestTerms.some(t => lower.includes(t))) return 'protest';
  return 'other';
}

export function newsItemToGeoEvent(item: NewsItem): GeoEvent | null {
  if (!item.location) return null;
  const text = `${item.title} ${item.description}`;
  return {
    id: item.id,
    title: item.title,
    location: item.location,
    type: determineEventType(text),
    timestamp: item.pubDate,
    source: item.source,
    link: item.link,
    severity: determineSeverity(text),
  };
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
