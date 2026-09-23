'use client';
import { useEffect, useState } from 'react';

// Officiële terreurdreigingsniveaus als smalle strook (23 sep 2026). Drie landen die het niveau als tekst publiceren.
interface TL { code: string; country: string; level: string; scale: string; label: string; source: string; url: string; ok: boolean }
const COLOR = (code: string, level: string) => {
  const n = Number(level); if (code === 'US') return n >= 2 ? '#ef4444' : n === 1 ? '#f59e0b' : '#6b7280';
  return n >= 5 ? '#ef4444' : n === 4 ? '#f97316' : n === 3 ? '#eab308' : '#6b7280';
};
export default function ThreatLevels() {
  const [d, setD] = useState<{ updatedAt: string; levels: TL[] } | null>(null);
  useEffect(() => { fetch('/api/threat-levels').then(r => r.json()).then(setD).catch(() => {}); }, []);
  if (!d || !d.levels.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 border-b border-[#1a1a1a] bg-[#070707]">
      <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#888]" title="Official national terrorism threat levels">Threat levels</span>
      {d.levels.map(l => (
        <a key={l.code} href={l.url} target="_blank" rel="noopener noreferrer" title={`${l.country} · ${l.source} · opens the official page`} className="flex items-center gap-2 text-[11px] font-mono hover:text-white text-[#ccc]">
          <span className="w-2 h-2 rounded-full" style={{ background: COLOR(l.code, l.level) }} />
          <span className="text-[#eee] font-bold">{l.code}</span>
          <span>{l.level && l.scale ? `${l.level}${l.scale}` : ''}{l.label ? ` ${l.label}` : ''}{!l.ok ? ' (last known)' : ''}</span>
        </a>
      ))}
      <span className="ml-auto text-[10px] font-mono text-[#555]" title="Refreshed every 6 hours from the official pages">NCTV · GOV.UK · DHS</span>
    </div>
  );
}
