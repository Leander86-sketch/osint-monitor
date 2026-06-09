'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Camera } from '@/lib/types';

const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

function createCameraIcon() {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#8b5cf6;border:1px solid #a78bfa;opacity:0.7"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    className: '',
  });
}

export default function CameraLayer() {
  const [cameras, setCameras] = useState<Camera[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cameras');
      const data = await res.json();
      setCameras(data.cameras || []);
    } catch (err) {
      console.error('Camera fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 min
    return () => clearInterval(interval);
  }, [fetchData]);

  const icon = createCameraIcon();

  return (
    <>
      {cameras.map((c) => {
        if (!icon) return null;
        return (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={icon}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111' }}>
                <span style={{ fontWeight: 'bold', color: '#7c3aed' }}>{c.name}</span> · {c.city}
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[280px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">{c.name}</div>
                <div className="text-[#bbb] text-[11px] mb-2">{c.network} | {c.city}</div>
                {c.imageUrl && (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-full rounded"
                    style={{ maxHeight: '140px', objectFit: 'cover' }}
                    loading="lazy"
                  />
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
