import type { MetadataRoute } from 'next';
import { computeSituations } from '@/lib/situations';
import { ensureFeedsLoaded } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Sitemap (19 sep 2026): homepage, het focus-artikel en één pagina per lopende situatie.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://argus.prototipo.nl'; const now = new Date();
  let sits: MetadataRoute.Sitemap = [];
  try { await ensureFeedsLoaded(); sits = computeSituations().map(s => ({ url: `${base}/s/${s.slug}`, lastModified: s.latestPubDate ? new Date(s.latestPubDate) : now, changeFrequency: 'hourly' as const, priority: 0.8 })); } catch { /* leeg */ }
  return [{ url: base, lastModified: now, changeFrequency: 'hourly', priority: 1 }, { url: `${base}/focus`, lastModified: now, changeFrequency: 'daily', priority: 0.9 }, ...sits];
}
