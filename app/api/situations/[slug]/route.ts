import { NextRequest, NextResponse } from 'next/server';
import { computeSituations, getSituationBySlug } from '@/lib/situations';
import { ensureFeedsLoaded, getNewsItems } from '@/lib/store';
import { NewsItem } from '@/lib/types';

export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  await ensureFeedsLoaded();
  const { slug } = await ctx.params;
  const situation = getSituationBySlug(slug);
  if (!situation) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const all = getNewsItems(2000, 0);
  const byId = new Map(all.map(i => [i.id, i]));
  const items = situation.itemIds.map(id => byId.get(id)).filter((i): i is NewsItem => !!i);

  const mine = new Set(situation.keywords);
  const related = computeSituations()
    .filter(s => s.slug !== situation.slug)
    .map(s => {
      const theirs = new Set(s.keywords);
      const inter = [...mine].filter(k => theirs.has(k)).length;
      const uni = new Set([...mine, ...theirs]).size || 1;
      return { slug: s.slug, title: s.title, severity: s.severity, score: inter / uni };
    })
    .filter(r => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({ situation, items, related, bbox: situation.bbox });
}
