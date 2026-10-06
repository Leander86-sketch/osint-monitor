// "What's new" bovenin het paneel "What am I looking at?" (6 okt 2026, Leander). Handmatig bijhouden: bij elke
// zichtbare release één regel bovenaan — datum, één zin, link. De nieuwste vijf worden getoond; wat de bezoeker nog
// niet zag (localStorage 'argus-wn-seen' < datum) krijgt een NEW-markering.
export interface WhatsNew { date: string; text: string; href?: string }
export const WHATS_NEW: WhatsNew[] = [
  { date: '2026-10-06', text: 'Situation dossiers: a newspaper headline, the stand, a claim ledger (confirmed / reported / disputed / debunked), figures with a source per number, places on the map and a timeline — on every situation page.', href: '/s/russia-plague-irkutsk' },
  { date: '2026-10-06', text: 'DOSSIERS button in the header: one list of the Focus dossier and every situation page.' },
  { date: '2026-10-06', text: 'Focus · Hybrid Europe 2.0: where it stands in plain sentences, documented 2022–2025 vs reported 2026, by-country table, last 14 days.', href: '/focus' },
  { date: '2026-10-06', text: 'Anchor line on every situation: the newest headline from Reuters, AP, BBC and AFP (WHO for the plague dossier) — a rule, not a judgement.' },
  { date: '2026-09-23', text: 'National terror threat levels (NL, UK, US) above the situations; NAVWARN layer with navigational warnings in force.' },
  { date: '2026-09-19', text: 'Every situation has its own shareable page under /s/…; Focus dossier Hybrid Europe; Same event, different words per viewpoint.' },
];
