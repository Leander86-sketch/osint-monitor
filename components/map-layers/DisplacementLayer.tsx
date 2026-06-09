'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface DisplacementData {
  country: string;
  iso: string;
  lat: number;
  lng: number;
  refugees: number;
  idps: number;
  asylumSeekers: number;
  total: number;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function DisplacementLayer() {
  const [data, setData] = useState<DisplacementData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/displacement');
      const json = await res.json();
      setData(json.displacement || []);
    } catch (err) {
      console.error('Displacement fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      {data.map((d) => {
        // Radius scales with log of total displacement
        const radius = Math.min(35, Math.max(8, Math.log10(d.total) * 6));
        return (
          <CircleMarker
            key={`disp-${d.iso}`}
            center={[d.lat, d.lng]}
            radius={radius}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.10,
              weight: 1.5,
              opacity: 0.4,
              dashArray: '4 4',
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111', maxWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', color: '#b45309' }}>{d.country}</div>
                <div>Displaced: {formatNum(d.total)} people</div>
                {d.refugees > 0 && <div>Refugees: {formatNum(d.refugees)}</div>}
                {d.idps > 0 && <div>IDPs: {formatNum(d.idps)}</div>}
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[220px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">{d.country} — Displacement</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>TOTAL DISPLACED: {d.total.toLocaleString()}</div>
                  <div>REFUGEES: {d.refugees.toLocaleString()}</div>
                  <div>IDPs: {d.idps.toLocaleString()}</div>
                  <div>ASYLUM SEEKERS: {d.asylumSeekers.toLocaleString()}</div>
                  <div className="text-[#666] mt-1">Source: UNHCR 2024</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
