'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CarrierGroup } from '@/lib/types';

const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

function createCarrierIcon() {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:16px;filter:drop-shadow(0 0 3px rgba(0,0,0,0.7))">⚓</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: '',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function CarrierLayer() {
  const [carriers, setCarriers] = useState<CarrierGroup[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/carriers');
      const data = await res.json();
      setCarriers(data.carriers || []);
    } catch (err) {
      console.error('Carrier fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [fetchData]);

  const icon = createCarrierIcon();

  return (
    <>
      {carriers.map((c) => {
        if (!icon) return null;
        return (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={icon}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111' }}>
                <span style={{ fontWeight: 'bold', color: '#b45309' }}>{c.name}</span>
                {' '}({c.hullNumber}) · {c.region}
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[240px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">{c.name}</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>Aircraft carrier {c.hullNumber} · {c.region}</div>
                  <div>Last reported {timeAgo(c.lastSeen)}{c.source ? ` by ${c.source}` : ''}</div>
                  <div className="text-[#777]">Approximate position, derived from news reports</div>
                </div>
                {c.sourceUrl && (
                  <a href={c.sourceUrl} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">
                    OPEN SOURCE →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
