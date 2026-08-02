'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ConflictEvent } from '@/lib/types';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function ConflictLayer() {
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/conflicts');
      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch (err) {
      console.error('Conflict fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000); // 10 min
    return () => clearInterval(interval);
  }, [fetchData]);

  const getRadius = (numArticles: number) => {
    if (numArticles >= 20) return 18;
    if (numArticles >= 10) return 14;
    if (numArticles >= 5) return 10;
    return 7;
  };

  return (
    <>
      {conflicts.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={getRadius(c.numArticles)}
          pathOptions={{
            color: '#ff4444',
            fillColor: '#ff4444',
            fillOpacity: 0.15,
            weight: 1.5,
            opacity: 0.5,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '220px', color: '#111' }}>
              <div style={{ fontWeight: 'bold', color: '#cc0000' }}>{c.locationName || 'Conflict Zone'}</div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
              <div style={{ color: '#666' }}>{c.numArticles} articles · {timeAgo(c.timestamp)}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="text-[12px] max-w-[260px] font-mono">
              <div className="font-bold text-[#ccc] mb-1 leading-snug">{c.title}</div>
              <div className="text-[#bbb] space-y-0.5 text-[11px]">
                {c.locationName && <div>{c.locationName}</div>}
                <div>{c.numArticles} articles from {c.sources.length} sources ({c.sources.slice(0, 3).join(', ')})</div>
                <div className="text-[#777]">Location estimated from news coverage (GDELT)</div>
              </div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener" className="text-[#d4a012] hover:underline mt-1.5 block text-[11px]">
                  OPEN SOURCE →
                </a>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
