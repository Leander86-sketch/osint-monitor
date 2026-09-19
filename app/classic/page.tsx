import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';

export const dynamic = 'force-dynamic';
// De homepage van vóór 19 sep 2026, bewaard om mee te vergelijken en om terug te kunnen. Niet indexeerbaar.
export const metadata: Metadata = { title: 'ARGUS — classic', robots: { index: false, follow: false } };

export default function Page() { return <HomeClient />; }
