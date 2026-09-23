'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

interface NavWarn { id: string; kind: 'mine' | 'exercise' | 'gps' | 'ops' | 'cable' | 'hazard'; area: string; title: string; text: string; lat: number; lng: number; points: number; issued: string; year: number }
const LABEL: Record<NavWarn['kind'], string> = { mine: 'Mine danger', exercise: 'Missile / firing exercise', gps: 'GPS interference', ops: 'Military / submarine ops', cable: 'Cable / pipeline work', hazard: 'Hazardous operations' };
const COLOR: Record<NavWarn['kind'], string> = { mine: '#ef4444', exercise: '#f97316', gps: '#eab308', ops: '#a78bfa', cable: '#22d3ee', hazard: '#9ca3af' };

// Navigatiewaarschuwingen op zee (NGA MSI, public domain) — 23 sep 2026
export default function NavWarnLayer() {
  const [items, setItems] = useState<NavWarn[]>([]);
  const load = useCallback(async () => { try { const r = await fetch('/api/navwarn'); const d = await r.json(); setItems(d.warnings || []); } catch { /* stil */ } }, []);
  useEffect(() => { load(); const t = setInterval(load, 1800000); return () => clearInterval(t); }, [load]);
  return (
    <>
      {items.map(w => (
        <CircleMarker key={w.id} center={[w.lat, w.lng]} radius={w.kind === 'mine' || w.kind === 'exercise' ? 8 : 6}
          pathOptions={{ color: COLOR[w.kind], fillColor: COLOR[w.kind], fillOpacity: 0.25, weight: 1.5, opacity: 0.8, dashArray: w.points > 1 ? '3 3' : undefined }}>
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '240px', color: '#111' }}>
              <div style={{ fontWeight: 'bold' }}>{LABEL[w.kind]}</div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="text-[12px] max-w-[280px] font-mono">
              <div className="font-bold mb-1" style={{ color: COLOR[w.kind] }}>{LABEL[w.kind]}</div>
              <div className="text-[#ccc] leading-snug mb-1">{w.title}</div>
              <pre className="text-[10px] text-[#aaa] whitespace-pre-wrap max-h-40 overflow-auto">{w.text}</pre>
              <div className="text-[10px] text-[#777] mt-1">{w.area} · {w.issued}{w.points > 1 ? ` · ${w.points} positions, centre shown` : ''}</div>
              <a href="https://msi.nga.mil/NavWarnings" target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">NGA MSI →</a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
