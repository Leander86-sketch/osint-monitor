import type { Metadata } from 'next';
import FocusHybrid from '@/components/FocusHybrid';

export const dynamic = 'force-dynamic';
// Verdiepingsstuk (19 sep 2026): hybride prikacties in Europa. Voorvertoning onder /next, niet indexeerbaar tot Leander het vrijgeeft.
export const metadata: Metadata = { title: 'ARGUS — Focus: hybrid Europe', description: 'Drones, sabotage, cut cables and jamming across Europe: every incident with its source, attribution and severity.', robots: { index: false, follow: false } };

export default function Page() { return <FocusHybrid />; }
