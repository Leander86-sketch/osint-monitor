'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Flight } from '@/lib/types';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

function compass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

interface FlightLayerProps {
  bounds?: { north: number; south: number; east: number; west: number } | null;
}

export default function FlightLayer({ bounds }: FlightLayerProps) {
  const [flights, setFlights] = useState<Flight[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/flights');
      const data = await res.json();
      setFlights(data.flights || []);
    } catch (err) {
      console.error('Flight fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Viewport culling — only render flights visible on screen
  const visibleFlights = useMemo(() => {
    if (!bounds) return flights;
    return flights.filter(f =>
      f.lat >= bounds.south && f.lat <= bounds.north &&
      f.lng >= bounds.west && f.lng <= bounds.east
    );
  }, [flights, bounds]);

  return (
    <>
      {visibleFlights.map((f) => {
        const color = f.military ? '#dc2626' : '#38bdf8';
        return (
          <CircleMarker
            key={`${f.icao}-${f.military ? 'mil' : 'civ'}`}
            center={[f.lat, f.lng]}
            radius={f.military ? 4 : 2}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: f.military ? 0.9 : 0.6,
              weight: 1,
              opacity: 0.8,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111' }}>
                <span style={{ fontWeight: 'bold', color: f.military ? '#cc0000' : '#0066cc' }}>
                  {f.military ? '[MIL] ' : ''}{f.callsign || f.icao}
                </span>
                {' '}{Math.round(f.altitude).toLocaleString()}ft · {Math.round(f.speed)}kts
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[220px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">
                  {f.military && <span className="text-red-500">[MIL] </span>}
                  {f.callsign || f.icao}
                </div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  {f.type && <div>Aircraft: {f.type}{f.registration ? ` (${f.registration})` : ''}</div>}
                  {!f.type && f.registration && <div>Registration: {f.registration}</div>}
                  <div>Altitude: {Math.round(f.altitude).toLocaleString()} ft (~{(f.altitude * 0.0003048).toFixed(1)} km)</div>
                  <div>Speed: {Math.round(f.speed)} kn (~{Math.round(f.speed * 1.852)} km/h), heading {compass(f.heading)}</div>
                  {f.originCountry && <div>Registered in: {f.originCountry}</div>}
                </div>
                <a href={`https://globe.adsbexchange.com/?icao=${f.icao}`} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">TRACK LIVE →</a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
