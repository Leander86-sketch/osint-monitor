import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { getSituationBySlug } from '@/lib/situations';

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

export default function Page() {
  return <HomeClient />;
}
