'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

interface AirAlertState { id: number; name: string; alert: boolean; changed: string; lat: number; lng: number }

function since(changed: string): string {
  const t = new Date(changed).getTime(); if (!t) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

// Luchtalarmen Oekraïne per oblast — rode ring waar nu een alarm loopt, stille oblasten als klein grijs stipje.
// Alleen op de kaart; bewust niet in de rail (23 sep 2026).
export default function AirAlertLayer() {
  const [states, setStates] = useState<AirAlertState[]>([]);
  const load = useCallback(async () => { try { const r = await fetch('/api/airalerts'); const d = await r.json(); setStates(d.states || []); } catch { /* stil */ } }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  return (
    <>
      {states.map(s => (
        <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={s.alert ? 14 : 3}
          pathOptions={s.alert
            ? { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.28, weight: 2, opacity: 0.9 }
            : { color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.4, weight: 1, opacity: 0.5 }}>
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111' }}>
              <div style={{ fontWeight: 'bold', color: s.alert ? '#b91c1c' : '#374151' }}>{s.alert ? 'AIR RAID ALERT' : 'no alert'}</div>
              <div>{s.name}{s.changed ? ` · ${s.alert ? 'since' : 'clear for'} ${since(s.changed)}` : ''}</div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
