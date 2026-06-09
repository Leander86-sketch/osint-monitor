'use client';

import { Situation } from '@/lib/types';
import SituationCard from './SituationCard';

export default function SituationOverview({ situations, onFilter, onFocus }: { situations: Situation[]; onFilter?: (kw: string) => void; onFocus?: (bbox: [number, number, number, number]) => void }) {
  if (!situations.length) {
    return (
      <div className="text-center py-16 text-[#333] text-[12px] font-mono uppercase tracking-widest">
        No active situations — monitoring
      </div>
    );
  }
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {situations.map((s, i) => (
        <SituationCard key={s.id} s={s} rank={i + 1} onFilter={onFilter} onFocus={onFocus} />
      ))}
    </div>
  );
}
