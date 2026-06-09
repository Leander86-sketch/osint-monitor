'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ACLEDEvent } from '@/lib/types';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

function color(t: string): string {
  const s = (t || '').toLowerCase();
  if (s.includes('battle')) return '#dc2626';
  if (s.includes('explosion') || s.includes('remote')) return '#b91c1c';
  if (s.includes('civilian')) return '#f97316';
  if (s.includes('protest') || s.includes('riot')) return '#eab308';
  return '#9ca3af';
}
function radius(fat: number): number {
  return fat > 0 ? Math.max(5, Math.min(5 + fat, 16)) : 4;
}

export default function AcledLayer() {
  const [events, setEvents] = useState<ACLEDEvent[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/acled');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('ACLED fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 21600000); // 6h
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      {events.filter(e => typeof e.lat === 'number' && typeof e.lng === 'number' && !isNaN(e.lat) && !isNaN(e.lng)).map(e => (
        <CircleMarker
          key={e.id}
          center={[e.lat, e.lng]}
          radius={radius(e.fatalities)}
          pathOptions={{ color: color(e.eventType), fillColor: color(e.eventType), fillOpacity: 0.45, weight: 0.7, opacity: 0.7 }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '240px', color: '#111' }}>
              <div style={{ fontWeight: 'bold', color: '#990000' }}>{e.eventType}{e.fatalities > 0 ? ` · ${e.fatalities} killed` : ''}</div>
              <div>{e.location}, {e.country}</div>
              <div style={{ color: '#666' }}>{e.actor1}{e.actor2 ? ` vs ${e.actor2}` : ''} · {e.date}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="text-[12px] max-w-[280px] font-mono">
              <div className="font-bold text-[#ccc] mb-1">{e.eventType}{e.fatalities > 0 ? ` — ${e.fatalities} killed` : ''}</div>
              <div className="text-[#bbb] text-[11px] space-y-0.5">
                <div>{e.location}, {e.country} · {e.date}</div>
                <div>ACTORS: {e.actor1}{e.actor2 ? ` vs ${e.actor2}` : ''}</div>
                {e.notes && <div className="text-[#999] leading-snug mt-1">{e.notes}</div>}
                <div className="text-[#666]">SRC: {e.source}</div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
