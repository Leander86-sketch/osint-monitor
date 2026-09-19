import { redirect } from 'next/navigation';

// /next/focus was de voorvertoning; het artikel staat sinds 19 sep 2026 op /focus
export default function Page() { redirect('/focus'); }
