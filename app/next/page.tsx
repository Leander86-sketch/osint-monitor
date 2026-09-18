import type { Metadata } from 'next';
import NextClient from '@/components/NextClient';

export const dynamic = 'force-dynamic';
// Voorvertoning van de nieuwe bovenkant (18 sep 2026). Niet gelinkt en niet indexeerbaar tot Leander de twee wisselt.
export const metadata: Metadata = { title: 'ARGUS — preview', robots: { index: false, follow: false } };

export default function Page() { return <NextClient />; }
