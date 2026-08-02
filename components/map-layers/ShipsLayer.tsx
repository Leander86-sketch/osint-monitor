'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ShipPosition } from '@/lib/fetchers/ais';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

// AIS type code -> category + color
function shipStyle(t: number | null): { label: string; color: string } {
  if (t === null) return { label: 'Unknown', color: '#64748b' };
  if (t === 35) return { label: 'Military ops', color: '#ef4444' };
  if (t >= 80 && t <= 89) return { label: 'Tanker', color: '#f59e0b' };
  if (t >= 70 && t <= 79) return { label: 'Cargo', color: '#2dd4bf' };
  if (t >= 60 && t <= 69) return { label: 'Passenger', color: '#a78bfa' };
  if (t === 30) return { label: 'Fishing', color: '#84cc16' };
  if (t >= 50 && t <= 59) return { label: 'Special craft', color: '#38bdf8' };
  return { label: `Type ${t}`, color: '#64748b' };
}

const NAV_STATUS: Record<number, string> = {
  0: 'under way', 1: 'at anchor', 2: 'not under command', 3: 'restricted manoeuvre',
  5: 'moored', 6: 'aground', 7: 'fishing', 8: 'under sail',
};

export default function ShipsLayer() {
  const [ships, setShips] = useState<ShipPosition[]>([]);
  const [warming, setWarming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ships');
      const d = await res.json();
      setShips(d.ships || []);
      setWarming(!!d.warming);
    } catch (err) {
      console.error('Ships fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Faster polling while the stream warms up after idle
    const interval = setInterval(fetchData, warming ? 10000 : 60000);
    return () => clearInterval(interval);
  }, [fetchData, warming]);

  return (
    <>
      {ships.map(s => {
        const st = shipStyle(s.shipType);
        return (
          <CircleMarker
            key={s.mmsi}
            center={[s.lat, s.lng]}
            radius={s.shipType === 35 ? 6 : 3.5}
            pathOptions={{ color: st.color, fillColor: st.color, fillOpacity: 0.6, weight: 1, opacity: 0.8 }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '220px', color: '#111' }}>
                <div style={{ fontWeight: 'bold', color: st.color }}>{s.name || `MMSI ${s.mmsi}`}</div>
                <div>{st.label}{typeof s.speed === 'number' ? ` · ${s.speed.toFixed(1)} kn` : ''}{typeof s.course === 'number' ? ` · ${Math.round(s.course)}°` : ''}</div>
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[240px] font-mono">
                <div className="font-bold text-[#ccc] mb-1 leading-snug">{s.name || `MMSI ${s.mmsi}`}</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>TYPE: {st.label.toUpperCase()}{s.navStatus !== null && NAV_STATUS[s.navStatus] ? ` | ${NAV_STATUS[s.navStatus].toUpperCase()}` : ''}</div>
                  {typeof s.speed === 'number' && <div>SOG: {s.speed.toFixed(1)} KN{typeof s.course === 'number' ? ` | COG: ${Math.round(s.course)}°` : ''}</div>}
                  {s.destination && <div>DEST: {s.destination}</div>}
                  <div>MMSI: {s.mmsi}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
