'use client';

// Kaart van een dossier: de plaatsen uit de berichten, gekleurd op soort. Bouwt op FocusMap (zelfde tegels en stijl).
import FocusMap from '@/components/FocusMap';
import { KIND, PlaceKind } from '@/lib/dossier-kinds';

interface Place { name: string; where: string; role: string; lat: number; lon: number; kind: PlaceKind }

export default function DossierMap({ places, center, zoom }: { places: Place[]; center?: [number, number]; zoom?: number }) {
  const points = places.map((p, i) => ({ id: `pl-${i}`, lat: p.lat, lon: p.lon, color: KIND[p.kind].color, big: p.kind === 'event' || p.kind === 'site', approx: p.kind === 'unrelated' || p.kind === 'context', label: `${p.name} — ${p.where}` }));
  return <FocusMap points={points} onPick={() => {}} center={center} zoom={zoom} />;
}
