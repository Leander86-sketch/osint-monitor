'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection } from 'geojson';

const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

export default function FrontlineLayer() {
  const [data, setData] = useState<{ geojson: FeatureCollection; date: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/frontline');
      const d = await res.json();
      if (d.available && d.geojson) setData({ geojson: d.geojson, date: d.date });
    } catch (err) {
      console.error('Frontline fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3600000); // 1h; source updates daily
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data) return null;

  return (
    <GeoJSON
      key={data.date}
      data={data.geojson}
      style={{ color: '#b91c1c', weight: 1, opacity: 0.55, fillColor: '#b91c1c', fillOpacity: 0.10 }}
      onEachFeature={(_f, layer) => {
        layer.bindTooltip(
          `<div style="font-family:monospace;font-size:11px;color:#111"><b>Assessed Russian-controlled territory</b><br/>DeepStateMap · ${data.date}</div>`,
          { sticky: true, opacity: 0.95 }
        );
      }}
    />
  );
}
