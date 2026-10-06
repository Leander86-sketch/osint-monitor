'use client';

// Kaart van een situatie: automatische bollen (plaatsen uit de koppen, grootte = aantal koppen) plus de
// redactionele spelden op gebouwniveau. Bouwt op FocusMap (zelfde tegels en stijl).
import FocusMap, { MapPoint } from '@/components/FocusMap';

export default function DossierMap({ points, center, zoom }: { points: MapPoint[]; center?: [number, number]; zoom?: number }) {
  return <FocusMap points={points} onPick={() => {}} center={center} zoom={zoom} />;
}
