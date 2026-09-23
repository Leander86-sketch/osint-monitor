'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection } from 'geojson';

const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

// Rood = bezet (DeepState "Окуповано" + Krim + ORDLO), grijs = status onbekend (grijze zone).
const STYLE: Record<string, { color: string; fillColor: string; fillOpacity: number }> = {
  occupied: { color: '#b91c1c', fillColor: '#b91c1c', fillOpacity: 0.12 },
  unknown: { color: '#9ca3af', fillColor: '#9ca3af', fillOpacity: 0.10 },
};
const LABEL: Record<string, string> = { occupied: 'Assessed Russian-controlled territory', unknown: 'Status unknown (grey zone)' };

export default function FrontlineLayer() {
  const [data, setData] = useState<{ geojson: FeatureCollection; date: string; source: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/frontline');
      const d = await res.json();
      if (d.available && d.geojson) setData({ geojson: d.geojson, date: d.date, source: d.source || 'DeepStateMap' });
    } catch (err) {
      console.error('Frontline fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1800000); // 30 min; de bron ververst enkele keren per dag
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data) return null;

  return (
    <GeoJSON
      key={data.date}
      data={data.geojson}
      style={f => { const k = String(f?.properties?.kind || 'occupied'); const s = STYLE[k] || STYLE.occupied; return { ...s, weight: 1, opacity: 0.55 }; }}
      onEachFeature={(f, layer) => {
        const k = String(f?.properties?.kind || 'occupied');
        layer.bindTooltip(
          `<div style="font-family:monospace;font-size:11px;color:#111"><b>${LABEL[k] || LABEL.occupied}</b><br/>DeepStateMap · ${data.date}</div>`,
          { sticky: true, opacity: 0.95 }
        );
      }}
    />
  );
}
