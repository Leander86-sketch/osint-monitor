import { redirect } from 'next/navigation';

// /next was de voorvertoning van de nieuwe homepage; sinds 19 sep 2026 is dat de homepage zelf
export default function Page() { redirect('/'); }
