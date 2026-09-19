import type { Metadata } from 'next';
import NextClient from '@/components/NextClient';
import { getSituationBySlug, computeSituations } from '@/lib/situations';
import { ensureFeedsLoaded } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Per-situation OG tags for deep links (?sit=gaza): shared links unfurl
// with the live situation title, severity and latest headline.
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ sit?: string }> }
): Promise<Metadata> {
  try {
    const { sit } = await searchParams;
    if (sit) {
      const s = getSituationBySlug(sit);
      if (s) {
        const title = `ARGUS — ${s.title} [${s.severity.toUpperCase()}]`;
        const description = s.latestHeadline
          || `Live OSINT tracking: ${s.title} — ${s.metadata.articleCount} reports, status ${s.status}.`;
        return {
          title,
          description,
          openGraph: { title, description, siteName: 'ARGUS' },
          twitter: { card: 'summary', title, description },
        };
      }
    }
  } catch { /* fall back to layout metadata */ }
  return {};
}

// De situaties gaan al vanaf de server mee (19 sep 2026), zodat zoekmachines en linkvoorbeelden de echte inhoud zien
// in plaats van "0 active situations"; de browser ververst ze daarna zelf elke 30 seconden.
export default async function Home() {
  let initial: ReturnType<typeof computeSituations> = [];
  try { await ensureFeedsLoaded(); initial = computeSituations(); } catch { initial = []; }
  return <NextClient initialSituations={initial} />;
}
