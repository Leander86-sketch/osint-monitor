'use client';

import { useEffect, useState } from 'react';
import { Situation } from '@/lib/types';

export default function TypeOnHeadline({ situations }: { situations: Situation[] }) {
  const lines = situations
    .filter(s => s.status !== 'cooling' && s.latestHeadline)
    .slice(0, 6)
    .map(s => `${s.title.toUpperCase()} — ${s.latestHeadline}`);
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState('');
  const full = lines.length ? lines[idx % lines.length] : '';

  useEffect(() => {
    if (!full) { setShown(''); return; }
    let char = 0;
    setShown('');
    const typer = setInterval(() => {
      char++;
      setShown(full.slice(0, char));
      if (char >= full.length) clearInterval(typer);
    }, 28);
    const next = setTimeout(() => setIdx(i => i + 1), full.length * 28 + 4500);
    return () => { clearInterval(typer); clearTimeout(next); };
  }, [full, idx]);

  if (!lines.length) return null;
  return (
    <div className="inline-block max-w-full bg-black/70 border border-[#e8760a]/30 rounded px-3 py-1.5 backdrop-blur-sm">
      <span className="text-[10px] font-mono text-[#dc2626] mr-2 align-middle">● LIVE</span>
      <span className="text-[12px] font-mono text-[#e8760a] tracking-wide align-middle type-cursor">{shown}</span>
    </div>
  );
}
