'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface SentimentPoint {
  lat: number;
  lng: number;
  name: string;
  tone: number;
  articles: number;
  topTheme: string;
}

function getToneColor(tone: number): string {
  if (tone <= -5) return '#dc2626';    // very negative — red
  if (tone <= -2) return '#f97316';    // negative — orange
  if (tone <= -0.5) return '#eab308';  // slightly negative — yellow
  if (tone <= 0.5) return '#6b7280';   // neutral — gray
  if (tone <= 2) return '#84cc16';     // slightly positive — lime
  return '#22c55e';                     // positive — green
}

function getToneLabel(tone: number): string {
  if (tone <= -5) return 'VERY NEGATIVE';
  if (tone <= -2) return 'NEGATIVE';
  if (tone <= -0.5) return 'SLIGHTLY NEG';
  if (tone <= 0.5) return 'NEUTRAL';
  if (tone <= 2) return 'SLIGHTLY POS';
  return 'POSITIVE';
}

export default function SentimentLayer() {
  const [points, setPoints] = useState<SentimentPoint[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sentiment');
      const data = await res.json();
      setPoints(data.sentiment || []);
    } catch (err) {
      console.error('Sentiment fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 900000); // 15 min
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      {points.map((p) => {
        const color = getToneColor(p.tone);
        // Radius based on article count
        const radius = Math.min(30, Math.max(12, Math.sqrt(p.articles) * 2));
        return (
          <CircleMarker
            key={`sentiment-${p.name}`}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.12,
              weight: 1.5,
              opacity: 0.4,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111', maxWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', color }}>{p.name}: {getToneLabel(p.tone)}</div>
                <div>Tone: {p.tone > 0 ? '+' : ''}{p.tone} · {p.articles} articles</div>
              </div>
            </Tooltip>
            <Popup>
              <div className="text-[12px] max-w-[220px] font-mono">
                <div className="font-bold text-[#ccc] mb-1">{p.name} — Sentiment</div>
                <div className="text-[#bbb] space-y-0.5 text-[11px]">
                  <div>News tone: <span style={{ color }}>{p.tone > 0 ? '+' : ''}{p.tone} — {getToneLabel(p.tone)}</span></div>
                  <div>Based on {p.articles.toLocaleString()} articles in the last 24h (GDELT)</div>
                  <div className="text-[#777]">Topic: {p.topTheme}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
