// Kleuren en labels van een dossier; apart bestand omdat de kaart (client) ze ook nodig heeft en lib/dossiers.ts op fs leunt.
export type PlaceKind = 'event' | 'site' | 'measure' | 'context' | 'unrelated';
export const KIND: Record<PlaceKind, { label: string; color: string }> = {
  event: { label: 'Where it happened', color: '#ef4444' },
  site: { label: 'Related site', color: '#e8760a' },
  measure: { label: 'Measure in force', color: '#f59e0b' },
  context: { label: 'Named in reports', color: '#9ca3af' },
  unrelated: { label: 'Separate context', color: '#4b5563' },
};
export const STATUS: Record<'confirmed' | 'reported' | 'disputed' | 'debunked', { label: string; color: string; hint: string }> = {
  confirmed: { label: 'confirmed', color: '#4ade80', hint: 'Stated by an authority or an international body' },
  reported: { label: 'reported', color: '#f59e0b', hint: 'Reported by media, not confirmed by an authority' },
  disputed: { label: 'disputed', color: '#f97316', hint: 'Claimed by one side, denied by another' },
  debunked: { label: 'debunked', color: '#6b7280', hint: 'Checked and found false or misleading' },
};
export const EVENT: Record<'official' | 'media' | 'denial' | 'factcheck' | 'reaction', { label: string; color: string }> = {
  official: { label: 'official', color: '#60a5fa' },
  media: { label: 'media', color: '#9ca3af' },
  denial: { label: 'denial', color: '#f87171' },
  factcheck: { label: 'fact check', color: '#4ade80' },
  reaction: { label: 'reaction', color: '#c084fc' },
};
