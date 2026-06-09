'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Satellite } from '@/lib/types';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

interface SatelliteLayerProps {
  bounds?: { north: number; south: number; east: number; west: number } | null;
}

export default function SatelliteLayer({ bounds }: SatelliteLayerProps) {
  const [satellites, setSatellites] = useState<Satellite[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/satellites');
      const data = await res.json();
      setSatellites(data.satellites || []);
    } catch (err) {
      console.error('Satellite fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // was 30s, now 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  const getColor = (name: string) => {
    const n = name.toUpperCase();
    if (n.startsWith('ISS') || n.includes('TIANGONG')) return '#22c55e';
    if (n.startsWith('GPS')) return '#3b82f6';
    if (n.startsWith('STARLINK')) return '#a78bfa';
    if (n.includes('COSMOS') || n.includes('GLONASS')) return '#ef4444';
    return '#666666';
  };

  // Viewport culling
  const visibleSatellites = useMemo(() => {
    if (!bounds) return satellites;
    return satellites.filter(s =>
      s.lat >= bounds.south && s.lat <= bounds.north &&
      s.lng >= bounds.west && s.lng <= bounds.east
    );
  }, [satellites, bounds]);

  return (
    <>
      {visibleSatellites.map((s) => {
        const color = getColor(s.name);
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={s.name.startsWith('ISS') ? 6 : 2}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.8,
              weight: 1,
              opacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111' }}>
                <span style={{ fontWeight: 'bold', color: color }}>{s.name}</span>
                {' '}{Math.round(s.altitude).toLocaleString()}km
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[220px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">{s.name}</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>NORAD: {s.noradId}{s.intlDesignator ? ` | ${s.intlDesignator}` : ''}</div>
                  <div>ALT: {Math.round(s.altitude).toLocaleString()} km</div>
                  <div>SPD: {s.speed.toLocaleString()} km/h</div>
                  <div>POS: {s.lat.toFixed(2)}°, {s.lng.toFixed(2)}°</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
