'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { OutageEvent } from '@/lib/fetchers/outages';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

const CAUSE_LABEL: Record<string, string> = {
  GOVERNMENT_DIRECTED: 'Government-directed',
  POWER_OUTAGE: 'Power outage',
  TECHNICAL_PROBLEM: 'Technical problem',
  CABLE_CUT: 'Cable cut',
  CYBERATTACK: 'Cyberattack',
  MILITARY_ACTION: 'Military action',
  WEATHER: 'Weather',
  UNKNOWN: 'Unknown cause',
};

function timeAgo(dateStr: string): string {
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OutagesLayer() {
  const [outages, setOutages] = useState<OutageEvent[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/outages');
      const d = await res.json();
      setOutages(d.outages || []);
    } catch (err) {
      console.error('Outages fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1800000); // 30 min
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      {outages.map(o => (
        <CircleMarker
          key={o.id}
          center={[o.lat, o.lng]}
          radius={o.ongoing ? 12 : 8}
          pathOptions={{
            color: '#6366f1', fillColor: '#6366f1',
            fillOpacity: o.ongoing ? 0.30 : 0.12,
            weight: o.ongoing ? 2 : 1,
            opacity: o.ongoing ? 0.9 : 0.5,
            dashArray: o.ongoing ? undefined : '3 3',
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '230px', color: '#111' }}>
              <div style={{ fontWeight: 'bold', color: '#6366f1' }}>{o.country} — {o.ongoing ? 'ONGOING' : 'ended'}</div>
              <div>{CAUSE_LABEL[o.cause] || o.cause} · {timeAgo(o.startDate)}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="text-[12px] max-w-[260px] font-mono">
              <div className="font-bold text-[#ccc] mb-1 leading-snug">{o.country}: internet {o.outageType.toLowerCase()} {o.ongoing ? '(ongoing)' : '(ended)'}</div>
              <div className="text-[#999] text-[11px] leading-snug mb-1">{o.description}</div>
              <div className="text-[#bbb] text-[11px]">
                {CAUSE_LABEL[o.cause] || o.cause}{o.asns.length ? ` · ${o.asns.join(', ')}` : ''} · {timeAgo(o.startDate)}
              </div>
              <a href={o.url} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">CLOUDFLARE RADAR →</a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
