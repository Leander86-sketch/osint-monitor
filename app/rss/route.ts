import { NextResponse } from 'next/server';
import { computeSituations } from '@/lib/situations';
import { getNewsItems } from '@/lib/store';
import fs from 'fs';
import path from 'path';

// Token-free outbound distribution: RSS 2.0 feeds for feed readers,
// automations and (later) the ARGUS X pipeline.
//   /rss            -> escalation alerts + one item per tracked situation
//   /rss?sit=<slug> -> latest reports inside one situation

const SITE = 'https://argus.prototipo.nl';
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { ts: number; xml: string }>();

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rss(title: string, link: string, description: string, items: { title: string; link: string; date: string | number; description?: string; guid: string }[]): string {
  const body = items.map(i => `    <item>
      <title>${esc(i.title)}</title>
      <link>${esc(i.link)}</link>
      <guid isPermaLink="false">${esc(i.guid)}</guid>
      <pubDate>${new Date(i.date).toUTCString()}</pubDate>${i.description ? `
      <description>${esc(i.description)}</description>` : ''}
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <atom:link href="${esc(link)}" rel="self" type="application/rss+xml"/>
    <description>${esc(description)}</description>
    <language>en</language>
${body}
  </channel>
</rss>`;
}

interface Escalation { id: string; at: number; slug: string; title: string; kind: string; severity?: string; detail: string }
function readEscalations(): Escalation[] {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'situation-escalations.json'), 'utf8'));
    return Array.isArray(d) ? d : d.escalations || [];
  } catch { return []; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sit = url.searchParams.get('sit') || '';
  const key = sit || '_global';
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_MS) {
    return new NextResponse(hit.xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
  }

  const situations = computeSituations();
  let xml: string;

  if (sit) {
    const s = situations.find(x => x.slug === sit);
    if (!s) return new NextResponse('unknown situation', { status: 404 });
    const byId = new Map(getNewsItems(2000, 0).map(i => [i.id, i]));
    const items = s.itemIds.slice(0, 30)
      .map(id => byId.get(id))
      .filter((i): i is NonNullable<typeof i> => !!i)
      .map(i => ({ title: i.title, link: i.link, date: i.pubDate, description: `${i.source} · ${i.description || ''}`.slice(0, 300), guid: i.id }));
    xml = rss(
      `ARGUS — ${s.title} [${s.severity.toUpperCase()}]`,
      `${SITE}/?sit=${s.slug}`,
      `Live OSINT tracking: ${s.title} — ${s.metadata.articleCount} reports, status ${s.status}.`,
      items
    );
  } else {
    const escalations = readEscalations().slice(0, 20).map(e => ({
      title: `⚠ ${e.title}: ${e.detail}`,
      link: `${SITE}/?sit=${e.slug}`,
      date: e.at,
      guid: e.id,
    }));
    const sits = situations.map(s => ({
      title: `[${s.severity.toUpperCase()}] ${s.title} — ${s.latestHeadline || `${s.metadata.articleCount} reports`}`,
      link: `${SITE}/?sit=${s.slug}`,
      date: s.metadata.lastUpdated || Date.now(),
      description: `${s.status} · ${s.metadata.velocity1h} reports last hour · sourcing ${s.metadata.corroboration}`,
      guid: `sit-${s.slug}-${s.latestHeadline?.slice(0, 40) || s.metadata.articleCount}`,
    }));
    const all = [...escalations, ...sits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    xml = rss(
      'ARGUS — Situation Alerts',
      `${SITE}/rss`,
      'Escalation alerts and tracked situations from ARGUS, the open OSINT conflict monitor.',
      all
    );
  }

  cache.set(key, { ts: Date.now(), xml });
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
