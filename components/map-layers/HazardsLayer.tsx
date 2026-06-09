'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { HazardEvent } from '@/lib/types';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

const KIND_LABEL: Record<string, string> = { earthquake: 'Earthquake', EQ: 'Earthquake', TC: 'Cyclone', FL: 'Flood', DR: 'Drought', VO: 'Volcano', WF: 'Wildfire' };

function color(h: HazardEvent): string {
  if (h.alert === 'Red') return '#dc2626';
  if (h.alert === 'Orange') return '#d4a012';
  if (h.kind === 'earthquake' || h.kind === 'EQ') return '#9ca3af';
  return '#6b7280';
}
function radius(h: HazardEvent): number {
  if (typeof h.magnitude === 'number') return Math.max(5, Math.min(h.magnitude * 2.2, 18));
  return h.alert === 'Red' ? 14 : h.alert === 'Orange' ? 10 : 7;
}

export default function HazardsLayer() {
  const [hazards, setHazards] = useState<HazardEvent[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/hazards');
      const data = await res.json();
      setHazards(data.hazards || []);
    } catch (err) {
      console.error('Hazards fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1800000); // 30 min
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      {hazards.filter(h => typeof h.lat === 'number' && typeof h.lng === 'number' && !isNaN(h.lat) && !isNaN(h.lng)).map((h) => (
        <CircleMarker
          key={h.id}
          center={[h.lat, h.lng]}
          radius={radius(h)}
          pathOptions={{ color: color(h), fillColor: color(h), fillOpacity: 0.12, weight: 1, opacity: 0.5, dashArray: '2 2' }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '220px', color: '#111' }}>
              <div style={{ fontWeight: 'bold' }}>{KIND_LABEL[h.kind] || 'Hazard'}{typeof h.magnitude === 'number' ? ` M${h.magnitude}` : ''}{h.alert ? ` · ${h.alert}` : ''}</div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="text-[12px] max-w-[260px] font-mono">
              <div className="font-bold text-[#ccc] mb-1 leading-snug">{h.title}</div>
              <div className="text-[#bbb] text-[11px]">{KIND_LABEL[h.kind] || h.kind}{typeof h.magnitude === 'number' ? ` · M${h.magnitude}` : ''}{h.alert ? ` · ${h.alert} alert` : ''}</div>
              {h.url && <a href={h.url} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">DETAILS →</a>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
