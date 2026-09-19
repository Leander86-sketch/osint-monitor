'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

export interface MapPoint { id: string; lat: number; lon: number; color: string; big: boolean; approx: boolean; label: string }

// Incidenten op hetzelfde punt (landmidden) krijgen een kleine spiraal, anders liggen ze op één stapel.
export default function FocusMap({ points, onPick }: { points: MapPoint[]; onPick: (id: string) => void }) {
  const seen = new Map<string, number>();
  const placed = points.map(p => { const k = `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`; const i = seen.get(k) || 0; seen.set(k, i + 1); const a = i * 2.4, r = p.approx ? 0.22 * Math.sqrt(i) : 0.05 * Math.sqrt(i); return { ...p, lat: p.lat + Math.sin(a) * r, lon: p.lon + Math.cos(a) * r * 1.6 }; });
  return (
    <MapContainer center={[54, 15]} zoom={4} minZoom={3} maxZoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%', background: '#050505' }} attributionControl={false}>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
      {placed.map(p => (
        <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={p.big ? 7 : 4.5} pathOptions={{ color: p.color, weight: 1, fillColor: p.color, fillOpacity: p.approx ? 0.35 : 0.7, dashArray: p.approx ? '2 2' : undefined }} eventHandlers={{ click: () => onPick(p.id) }}>
          <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>{p.label}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
