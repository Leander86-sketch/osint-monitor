// Kleuren en labels van de plaats-soorten in een dossier; apart bestand omdat de kaart (client) ze ook nodig heeft
// en lib/dossiers.ts op fs leunt (server-only).
export type PlaceKind = 'event' | 'site' | 'measure' | 'context' | 'unrelated';
export const KIND: Record<PlaceKind, { label: string; color: string }> = {
  event: { label: 'Death (cause unconfirmed)', color: '#ef4444' },
  site: { label: 'Related site', color: '#e8760a' },
  measure: { label: 'Measure in force', color: '#f59e0b' },
  context: { label: 'Mentioned in reports', color: '#9ca3af' },
  unrelated: { label: 'Separate context', color: '#4b5563' },
};
