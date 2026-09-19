import type { Metadata } from 'next';
import FocusHybrid from '@/components/FocusHybrid';

export const dynamic = 'force-dynamic';
// Verdiepingsstuk: hybride prikacties in Europa. Live sinds 19 sep 2026 (was voorvertoning op /next/focus).
export const metadata: Metadata = {
  title: 'ARGUS — Focus: Hybrid Europe',
  description: 'Drones over airports, fires at substations, cut cables, jammed GPS: every hybrid incident in Europe with its source, attribution and severity.',
  openGraph: { title: 'ARGUS — Focus: Hybrid Europe', description: 'Every hybrid incident in Europe with its source, attribution and severity.', siteName: 'ARGUS' },
};

export default function Page() { return <FocusHybrid />; }
