'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FirePoint } from '@/lib/types';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

function color(frp: number): string {
  return frp >= 50 ? '#ff2a00' : frp >= 10 ? '#ff6a00' : '#ffa040';
}

export default function FirmsLayer() {
  const [fires, setFires] = useState<FirePoint[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/firms');
      const data = await res.json();
      setFires(data.fires || []);
    } catch (err) {
      console.error('FIRMS fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1800000); // 30 min
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      {fires.filter(f => typeof f.lat === 'number' && typeof f.lng === 'number' && !isNaN(f.lat) && !isNaN(f.lng)).map(f => (
        <CircleMarker
          key={f.id}
          center={[f.lat, f.lng]}
          radius={Math.max(3, Math.min(3 + f.frp / 8, 12))}
          pathOptions={{ color: color(f.frp), fillColor: color(f.frp), fillOpacity: 0.5, weight: 0.5, opacity: 0.7 }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '200px', color: '#111' }}>
              <div style={{ fontWeight: 'bold', color: '#cc3300' }}>THERMAL ANOMALY</div>
              <div>FRP {f.frp} MW · conf {f.confidence}</div>
              <div style={{ color: '#666' }}>{f.date} · VIIRS</div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
